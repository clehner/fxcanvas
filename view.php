<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  readfile('php://input');
}
