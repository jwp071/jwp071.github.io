//  This gives you an HTMLElement object
var element = document.getElementById('sampleJSON');
//  This gives you a string representing that element and its content
var html = element.outerHTML;       
//  This gives you a JSON object that you can send with jQuery.ajax's `data`
// option, you can rename the property to whatever you want.
var data = { html: html }; 

//  This gives you a string in JSON syntax of the object above that you can 
// send with XMLHttpRequest.
var json = JSON.stringify(data);
console.log(json)