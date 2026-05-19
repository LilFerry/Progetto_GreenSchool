<?php
$db="world";
$host="127.0.0.1";
$username="root";
$password="";
$conn=new PDO("mysql:host=$host;dbname=$db;charset=utf8",$username,$password);
$ris = $conn->query("SELECT * FROM vw_stato_colonnine;");
?>