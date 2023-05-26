<?php

//define a variable as array

$data = array(); 

//add datetime in array

$data[] = date('Y-m-d H:i:s');

// add ip in array

$data[] = @$_SERVER['REMOTE_ADDR'];

//get param data

$paramdata = @$_GET;

// run loop for all param data and store in array

if(!empty($paramdata)){

	foreach($paramdata as $pdata){

		$data[] = $pdata;

	}

}

//convert final array in string

$datastring = implode(';',$data)."\r\n";

//open csv file

$fp = fopen('2t.csv', 'a');

//write string data in csv

fwrite($fp, $datastring);

//close csv file

fclose($fp);

// Feedback caller
http_response_code(200);
echo 'OK';

?>