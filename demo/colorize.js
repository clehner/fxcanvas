
// todo moving this demo into fxcanvas/demo/colorize folder
if(self.importScripts) {
  importScripts("forker_helpers.js")
  $Import(self, "forker_helpers.*")
}

self.saturation = .5
self.colorTone = 180

// IE fix
if(self.addEventListener) {
    self.addEventListener('message', function(e) {

      //trace("forker gave message", e.data)
      var buf = e.data
      if(typeof buf == "string" && buf.indexOf("args") > -1) {
          var config = buf.split(";")
          self.saturation = Number(config[1])
          self.colorTone = Number(config[2])
          self.postMessage("ok");
      }
      else {
        self.postMessage(colorize(self.JSON2ImageData(buf)));
      }
            

    }, false);
}

function colorize (buf) {

  var color ={}, rgb, hsl, p;

    for(var i=0; i<buf.width*buf.height; i++) {

        p = buf.data[i]
        color.r = p >> 24 & 0xFF,
        color.g = p >> 16 & 0xFF,
        color.b = p >> 8 & 0xFF
        var alpha = p & 0xFF;

        hsl = RGB2HSL(color)
        hsl.s *= self.saturation
        hsl.h = self.colorTone
        rgb = HSL2RGB(hsl)

        /*
        throw [color.r , color.g , color.b] + ";" 
            + [hsl.h , hsl.s , hsl.l] + ";" 
            + [rgb.r , rgb.g , rgb.b] + ";" 
            */

        buf.data[i] = (rgb.r << 24) + (rgb.g << 16) + (rgb.b << 8) + alpha;
    }

    return buf
}

  /*
     Calculate HSL from RGB
     Hue is in degrees
     Lightness is between 0 and 1
     Saturation is between 0 and 1
  */
  function RGB2HSL(c1)
  {
     var themin,themax,delta;
     var c2={};

     themin = Math.min(c1.r,Math.min(c1.g,c1.b));
     themax = Math.max(c1.r,Math.max(c1.g,c1.b));
     delta = themax - themin;
     c2.l = (themin + themax) / 2;
     c2.s = 0;

     //if (c2.l > 0 && c2.l < 1)
        c2.s = delta / (c2.l < 0.5 ? (2*c2.l) : (2-2*c2.l));
     c2.h = 0;
     if (delta > 0) {
        if (themax == c1.r && themax != c1.g)
           c2.h += (c1.g - c1.b) / delta;
        if (themax == c1.g && themax != c1.b)
           c2.h += (2 + (c1.b - c1.r) / delta);
        if (themax == c1.b && themax != c1.r)
           c2.h += (4 + (c1.r - c1.g) / delta);
        c2.h *= 60;
     }
     return(c2);
  }

  /*
     Calculate RGB from HSL, reverse of RGB2HSL()
     Hue is in degrees
     Lightness is between 0 and 1
     Saturation is between 0 and 1
  */
  function HSL2RGB(c1)
  {
      var c2={}, 
          sat_r, sat_g, sat_b,
          ctmp_r, ctmp_g, ctmp_b;

     while (c1.h < 0)
        c1.h += 360;
     while (c1.h > 360)
        c1.h -= 360;

     if (c1.h < 120) {
        sat_r = (120 - c1.h) / 60.0;
        sat_g = c1.h / 60.0;
        sat_b = 0;
     } else if (c1.h < 240) {
        sat_r = 0;
        sat_g = (240 - c1.h) / 60.0;
        sat_b = (c1.h - 120) / 60.0;
     } else {
        sat_r = (c1.h - 240) / 60.0;
        sat_g = 0;
        sat_b = (360 - c1.h) / 60.0;
     }
     sat_r = Math.min(sat_r,1);
     sat_g = Math.min(sat_g,1);
     sat_b = Math.min(sat_b,1);

     ctmp_r = 2 * c1.s * sat_r + (1 - c1.s);
     ctmp_g = 2 * c1.s * sat_g + (1 - c1.s);
     ctmp_b = 2 * c1.s * sat_b + (1 - c1.s);

     if (c1.l < 0.5) {
        c2.r = c1.l * ctmp_r;
        c2.g = c1.l * ctmp_g;
        c2.b = c1.l * ctmp_b;
     } else {
        c2.r = (1 - c1.l) * ctmp_r + 2 * c1.l - 1;
        c2.g = (1 - c1.l) * ctmp_g + 2 * c1.l - 1;
        c2.b = (1 - c1.l) * ctmp_b + 2 * c1.l - 1;
     }

     return(c2);
  }

