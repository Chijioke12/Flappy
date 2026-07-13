import os
import wave
import struct
import math
import subprocess

# Ensure output directory exists
os.makedirs("public/assets", exist_ok=True)

def save_wav(samples, filename):
    """Saves standard 16-bit mono 44100Hz PCM WAV file."""
    with wave.open(filename, 'wb') as w:
        w.setnchannels(1)  # Mono
        w.setsampwidth(2)  # 16-bit (2 bytes)
        w.setframerate(44100)
        data = struct.pack(f'<{len(samples)}h', *samples)
        w.writeframes(data)

def convert_to_ogg(wav_path, ogg_path):
    """Converts a WAV file to OGG format using ffmpeg."""
    print(f"Converting {wav_path} to {ogg_path}...")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-acodec", "libvorbis", ogg_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"Successfully created {ogg_path}")
        if os.path.exists(wav_path):
            os.remove(wav_path)
    except Exception as e:
        print(f"ffmpeg conversion failed. Keeping WAV as fallback or check if ffmpeg is installed. Error: {e}")

# ==============================================================================
# 1. FLAP SOUND (Triangle Wave sweep from 250Hz to 550Hz)
# ==============================================================================
def make_flap():
    sample_rate = 44100
    duration = 0.15
    num_samples = int(sample_rate * duration)
    samples = []
    phase = 0.0
    
    for i in range(num_samples):
        t = i / sample_rate
        # Exponential frequency sweep
        freq = 250.0 * ((550.0 / 250.0) ** (t / duration))
        phase = (phase + freq / sample_rate) % 1.0
        
        # Triangle wave formula
        val = 2.0 * abs(2.0 * phase - 1.0) - 1.0
        
        # Exponential decay envelope
        env = 0.15 * (0.01 ** (t / duration))
        
        amplitude = int(val * env * 32767)
        samples.append(amplitude)
    return samples

# ==============================================================================
# 2. SCORE CHIME (Two-note chiptune Square Wave)
# ==============================================================================
def make_score():
    sample_rate = 44100
    duration = 0.25
    num_samples = int(sample_rate * duration)
    samples = []
    phase1 = 0.0
    phase2 = 0.0
    
    for i in range(num_samples):
        t = i / sample_rate
        val = 0.0
        
        # Note 1 (A5 / 880Hz, from t=0.0 to t=0.1)
        if t < 0.1:
            freq = 880.0
            phase1 = (phase1 + freq / sample_rate) % 1.0
            sq = 1.0 if phase1 < 0.5 else -1.0
            env = 0.05 * (0.05 ** (t / 0.1))
            val += sq * env
            
        # Note 2 (E6 / 1318.51Hz, from t=0.08 to t=0.25)
        if t >= 0.08:
            t2 = t - 0.08
            freq = 1318.51
            phase2 = (phase2 + freq / sample_rate) % 1.0
            sq = 1.0 if phase2 < 0.5 else -1.0
            env = 0.05 * (0.05 ** (t2 / 0.17))
            val += sq * env
            
        amplitude = int(val * 32767)
        samples.append(amplitude)
    return samples

# ==============================================================================
# 3. HIT SOUND (Sawtooth wave pitching down from 180Hz to 50Hz)
# ==============================================================================
def make_hit():
    sample_rate = 44100
    duration = 0.3
    num_samples = int(sample_rate * duration)
    samples = []
    phase = 0.0
    
    for i in range(num_samples):
        t = i / sample_rate
        # Linear frequency sweep down
        if t < 0.25:
            freq = 180.0 - (180.0 - 50.0) * (t / 0.25)
        else:
            freq = 50.0
            
        phase = (phase + freq / sample_rate) % 1.0
        
        # Sawtooth wave formula
        val = 2.0 * phase - 1.0
        
        # Exponential decay envelope
        env = 0.2 * (0.02 ** (t / duration))
        
        amplitude = int(val * env * 32767)
        samples.append(amplitude)
    return samples

if __name__ == "__main__":
    print("Generating sound waves...")
    
    flap_wav = "public/assets/flap.wav"
    score_wav = "public/assets/score.wav"
    hit_wav = "public/assets/hit.wav"
    
    save_wav(make_flap(), flap_wav)
    save_wav(make_score(), score_wav)
    save_wav(make_hit(), hit_wav)
    
    flap_ogg = "public/assets/flap.ogg"
    score_ogg = "public/assets/score.ogg"
    hit_ogg = "public/assets/hit.ogg"
    
    convert_to_ogg(flap_wav, flap_ogg)
    convert_to_ogg(score_wav, score_ogg)
    convert_to_ogg(hit_wav, hit_hit_ogg := hit_ogg)
    
    print("Sound generation process complete.")
