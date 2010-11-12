<?php

header("Content-type: text/javascript");

$userAgent = $_SERVER['HTTP_USER_AGENT'];
$isIE = preg_match("/MSIE|JSDBG/", $userAgent); // MS jokes..
$root = dirname(__FILE__);
$src = $root . "/src";

print "\$__debug=1;\$__isIE=$isIE;\$__userAgent='$userAgent';\r\n";

$js_src = array();

$js_src[] = "util.js";
$js_src[] = "config.js";
$js_src[] = "fxcanvas.js";
$js_src[] = "extCanvasRenderingContext2D.js";
if($isIE) {
  $js_src[] = "ContextMenu.js";
  $js_src[] = "FlashRenderingBackend2D.js";
} else {
  $js_src[] = "CanvasRenderingBackend2D.js";
}

foreach($js_src as $js) {
  $macro = array("__PATH__", "__FILE__");
  $replace = array("'" . $src . "'", "'$js'");
  echo str_replace($macro, $replace, file_get_contents("$src/$js"));
}
