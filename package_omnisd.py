import os
import zipfile
import json
import shutil

def zip_dir(path, zip_handler):
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, path)
            zip_handler.write(file_path, arcname)

def eliminate_unwanted_ui(dist_dir):
    index_html_path = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_html_path):
        print("Modifying dist/index.html to eliminate unwanted browser simulator UI...")
        with open(index_html_path, 'r', encoding='utf-8') as f:
            html = f.read()
            
        kaios_styles = """
<style id="kaios-native-styles">
  /* Hide headers, footers, and mock phone controllers */
  #app-wrapper > header,
  #app-wrapper > footer,
  .console-controls,
  #app-wrapper div[style*="borderBottom"] {
    display: none !important;
  }
  
  /* Reset body and container padding to fill physical screen */
  body {
    background-color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    width: 100vw !important;
    height: 100vh !important;
  }
  
  #root {
    padding: 0 !important;
    margin: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    justify-content: center !important;
    align-items: center !important;
  }
  
  #app-wrapper {
    gap: 0 !important;
    width: 100% !important;
    height: 100% !important;
    justify-content: center !important;
    align-items: center !important;
  }
  
  .console-frame {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    justify-content: center !important;
    align-items: center !important;
  }
  
  .screen-container {
    border: none !important;
    border-radius: 0 !important;
    width: 320px !important;
    height: 240px !important;
    background-color: #000000 !important;
  }
</style>
"""
        if "</head>" in html:
            html = html.replace("</head>", f"{kaios_styles}</head>")
        else:
            html = html + kaios_styles
            
        with open(index_html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print("Successfully stripped simulation UI from dist/index.html")

def update_manifest_properties(dist_dir):
    manifest_path = os.path.join(dist_dir, "manifest.webapp")
    if os.path.exists(manifest_path):
        print("Updating dist/manifest.webapp properties...")
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            data["type"] = "web"
            data["fullscreen"] = "true"
            data["orientation"] = ["landscape"]
            
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print("Successfully updated dist/manifest.webapp")
        except Exception as e:
            print(f"Failed to parse or update manifest: {e}")

def main():
    dist_dir = "dist"
    if not os.path.exists(dist_dir):
        print(f"Error: {dist_dir} directory does not exist! Run build first.")
        return

    print("Packaging OmniSD package for KaiOS...")

    # Eliminate unwanted UI elements and update manifest in the build output before zipping
    eliminate_unwanted_ui(dist_dir)
    update_manifest_properties(dist_dir)

    # 1. Create application.zip containing all files in dist/
    app_zip_path = "dist-application.zip"
    with zipfile.ZipFile(app_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zip_dir(dist_dir, zipf)
    print("Created application.zip")

    # 2. Create update.webapp (can be empty but must be present)
    update_webapp_path = "dist-update.webapp"
    with open(update_webapp_path, "w") as f:
        f.write("")
    print("Created empty update.webapp")

    # 3. Create metadata.json
    metadata_path = "dist-metadata.json"
    metadata_content = {
        "version": 1,
        "manifestURL": "app://kaios-flappy-bird/manifest.webapp"
    }
    with open(metadata_path, "w") as f:
        json.dump(metadata_content, f)
    print("Created metadata.json")

    # 4. Pack them all together into kaios-flappy-bird-omnisd.zip
    final_zip_name = "kaios-flappy-bird-omnisd.zip"
    with zipfile.ZipFile(final_zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(app_zip_path, "application.zip")
        zipf.write(update_webapp_path, "update.webapp")
        zipf.write(metadata_path, "metadata.json")
    print(f"Successfully packaged OmniSD archive as: {final_zip_name}")

    # Also save a copy inside the dist/ folder so it's included in build outputs
    dist_zip_path = os.path.join(dist_dir, final_zip_name)
    shutil.copyfile(final_zip_name, dist_zip_path)
    print(f"Also saved a copy to {dist_zip_path}")

    # Clean up temporary files
    os.remove(app_zip_path)
    os.remove(update_webapp_path)
    os.remove(metadata_path)

if __name__ == "__main__":
    main()
