using System;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace SimRekcahNative
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            InitializeAsync();
        }

        async void InitializeAsync()
        {
            try
            {
                // Set the user data folder to a local path to avoid permission issues
                var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Path.GetTempPath(), "SimRekcahNative"));
                await webView.EnsureCoreWebView2Async(env);
                
                // Determine the root folder of the web application
                // Assuming the exe is in native/bin/Debug/net8.0-windows/
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string rootFolder = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", ".."));
                
                // Fallback for production/packaged layout
                if (!File.Exists(Path.Combine(rootFolder, "index.html")))
                {
                    rootFolder = baseDir;
                }

                // Map https://rekcah.local to the root folder
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping("rekcah.local", rootFolder, CoreWebView2HostResourceAccessKind.Allow);
                
                // Navigate to the local mapping
                webView.CoreWebView2.Navigate("https://rekcah.local/index.html");
                
                // Optional: Enable DevTools in debug mode
#if DEBUG
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
#else
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
#endif
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to initialize WebView2: {ex.Message}", "Initialization Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}