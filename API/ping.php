<?php
header("Content-Type: application/json");
echo json_encode(["message" => "Connection established with the PHP API!", "time" => date("c")]);