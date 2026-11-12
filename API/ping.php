<?php
header("Content-Type: application/json");
echo json_encode(["message" => "Gumagana ang PHP API!", "time" => date("c")]);