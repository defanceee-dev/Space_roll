let cart = [];

function addToCart(name,price){

cart.push({
name:name,
price:price
});

alert(name + " добавлен");

}

function checkout(){

let order = JSON.stringify(cart);

Telegram.WebApp.sendData(order);

}