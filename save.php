<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  header('Content-Type: application/octet-stream');
  header('Content-Disposition: attachment; filename="canvas.png"');
  readfile('php://input');
}
