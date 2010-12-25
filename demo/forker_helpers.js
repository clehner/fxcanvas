
// I'm going to use ImageData class from fxcanvas ...
if(self.importScripts)
    importScripts("../jooscript.js", "../fxcanvas.js")

$Unit(__PATH__, __FILE__, function(unit){

    unit.Import("platform", "buz.fxcanvas.ImageData")

    unit.Package("forker_helpers", function(helpers){
        
        // Helpers used for image data transition
        //
        function JSON2ImageData(buf) {

            if(!unit.platform.isIE)
                return new unit.ImageData(buf.width, buf.height, buf.data)

            var dataStart = buf.indexOf(";")
            var wh = buf.substring(0, dataStart).split(",")
            var width = parseInt(wh[0])
            var height = parseInt(wh[1])
            var data = []

            buf = buf.substr(dataStart+1)

            for(var i=0; i<width*height; i++){

              var ofs = i*5,
                  mask  = buf.charCodeAt(ofs),
                  red   = buf.charCodeAt(ofs+1) ^ (mask & 0x2), 
                  green = buf.charCodeAt(ofs+2) ^ (mask & 0x4), 
                  blue  = buf.charCodeAt(ofs+3) ^ (mask & 0x8), 
                  alpha = buf.charCodeAt(ofs+4) ^ (mask & 0x10);

              data[i] = (red << 24) + (green << 16) + (blue << 8) + alpha;
            }

            return new unit.ImageData(width, height, data)
        }

        function ImageData2JSON(buf) {

            // I'll send data as object because of they using internal object serialization
            if(!unit.platform.isIE)
                return {width: buf.width, height: buf.height, data: buf.data}

            var m = [];
            var strBuf = [];

            // precalculate mask for bad chars
            //
            for (var i=0; i<256; i++) {
              switch (i) {
                case 0:  // \x00
                case 37: // %
                case 38: // &
                case 43: // +
                case 61: // =
                    m[i] = 1;
                    break;
                default:
                    m[i] = 0;
              }
            }

            for(var i=0; i<buf.data.length; i++) 
            {
              var pix = buf.data[i],
                  red = pix >> 24 & 0xFF,
                  green = pix >> 16 & 0xFF,
                  blue = pix >> 8 & 0xFF,
                  alpha = pix & 0xFF,
                  mask_red = m[red] << 1,
                  mask_green = m[green] << 2,
                  mask_blue = m[blue] << 3,
                  mask_alpha = m[alpha] << 4;

                  strBuf[strBuf.length] = String.fromCharCode( 
                                  mask_red + mask_green + mask_blue + mask_alpha + 1,
                                  red ^ mask_red, 
                                  green ^ mask_green, 
                                  blue ^ mask_blue, 
                                  alpha ^ mask_alpha );
            }

            return [buf.width,",",buf.height,";",strBuf.join("")].join("")
        }

        helpers.JSON2ImageData = JSON2ImageData
        helpers.ImageData2JSON = ImageData2JSON
    })
})
