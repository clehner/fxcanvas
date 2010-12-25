/*
 * fxCanvas config
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Unit(__PATH__, __FILE__, function(unit)
{
  unit.Import("platform");

  $Package("buz.fxcanvas.config", function(config) {

    // Initialize after content was loaded to using the script inside Workers ...
    unit.Event.once("initialize", function(){
        
      config["version"] = "$(Version)"

      // some values can be changed via canvas tag attributes or
      // via $groups.buz.fxcanvas.config

      // enable/disable extended context
      config["enable"] = true

      // necessary trace bounding box to determine point in path in IE,
      // disabling this may speed up drawing a little bit, but then isPointInPath() and 
      // isPointInPathBounds() will always return false 
      config["tracePathBounds"] = unit.platform.isIE

      // As flash backend is running at high frame rate, so that static graphics may
      // generate high cpu usage in some cases. On inactivity, frame rate are set to minimum.
      config["idleInterval"] = 2000

      // Default frame duration.
      config["frameDuration"] = 100

      // Canvas context menu config. Set it false or null to disable.
      config["contextMenu"] = [
        { "id":"view", "label" : {"ru": "Открыть изображение", "en": "View Image"} },
        { "id":"save_as", "label" : {"ru": "Сохранить изображение как...", "en": "Save Image As..."} },
        "----",
        { "id":"about", "label" : {"ru": "О программе fxCanvas...", "en": "About fxCanvas..."} },
        { "id":"about_flash", "label" : {"ru": "О программе Adobe Flash Player...", "en": "About Adobe Flash Player..."} }
      ]

      // Image data decoders.
      config["viewImageURL"] = "view.php"
      config["saveAsURL"] = "save.php"

      // Script names.
      config["flashBackendJS"] = "$(flash_backend_js)"
      config["canvasBackendJS"] = "$(canvas_backend_js)"

      // Project home page.
      config["projectURL"] = "$(projectURL)"

      // Main script file name
      config["fxcanvas_js"] = "$(fxcanvas_js)"

      // determine script url
      config["script_url"] = (function() {
        var scripts = document.getElementsByTagName("script");
        for(var i=0;i<scripts.length;i++) {
          if(scripts[i].src.indexOf(config["fxcanvas_js"]) > -1)
            return scripts[i].getAttribute("src", 2);
        }
      }()),
      config["script_path"] = config["script_url"].replace(/[^\/]+$/, "")

      // Proxy script used for loading images from another domain.
      // Note: PHP and CURL required .
      config["imageProxy"] = config["script_path"] + "proxy.php"

      // Enable or disable some extended canvas features
      config["useCanvasPath"] = false

      // Enable or disable use raw image data.
      config["useRawImageData"] = false
    })
      
  });
});
