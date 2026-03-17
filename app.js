const WEBHOOK = "https://hook.eu1.make.com/4g2rl5l2j9uogybctr5ypsahp1k4t51s";

let cart = [];

const menu = [
 {name:"Філадельфія Classic",price:290,poster_id:null},
 {name:"Каліфорнія",price:260,poster_id:null}
];

function render(){
 const el = document.getElementById("menu");
 el.innerHTML="";
 menu.forEach(item=>{
  el.innerHTML+=`
   <div class="card">
    <h3>${item.name}</h3>
    <p>${item.price} грн</p>
    <button onclick="add('${item.name}',${item.price})">Додати</button>
   </div>
  `;
 });
}

function add(name,price){
 const item = cart.find(i=>i.name===name);
 if(item){item.qty++}else{cart.push({name,price,qty:1})}
 update();
}

function update(){
 let count=0;
 cart.forEach(i=>count+=i.qty);
 document.getElementById("count").innerText=count;
}

function openCart(){
 const modal = document.getElementById("cart-modal");
 modal.classList.remove("hidden");

 let html="<h2>Кошик</h2>";
 let total=0;

 cart.forEach(i=>{
  total+=i.price*i.qty;
  html+=`<p>${i.name} x${i.qty}</p>`;
 });

 html+=`<h3>${total} грн</h3>`;
 html+=`<button onclick="checkout()">Оформити</button>`;
 html+=`<button onclick="closeCart()">Закрити</button>`;

 modal.innerHTML=html;
}

function closeCart(){
 document.getElementById("cart-modal").classList.add("hidden");
}

function checkout(){
 closeCart();

 const modal = document.getElementById("checkout-modal");
 modal.classList.remove("hidden");

 modal.innerHTML=`
  <h2>Тип замовлення</h2>
  <button onclick="form('delivery')">Доставка</button>
  <button onclick="form('pickup')">Самовивіз</button>
 `;
}

function form(type){
 const modal = document.getElementById("checkout-modal");

 modal.innerHTML=`
  <h2>Дані</h2>
  <input id="name" placeholder="Ім'я"><br>
  <input id="phone" placeholder="Телефон"><br>
  ${type==="delivery" ? '<input id="address" placeholder="Адреса"><br>' : ''}
  <input id="time" type="time"><br>
  <input id="cutlery" type="number" placeholder="Прибори"><br>
  <textarea id="comment" placeholder="Коментар"></textarea><br>
  <button onclick="send('${type}')">Відправити</button>
 `;
}

function send(type){
 const data={
  type,
  name:document.getElementById("name").value,
  phone:document.getElementById("phone").value,
  address:document.getElementById("address")?.value || "",
  time:document.getElementById("time").value,
  cutlery:document.getElementById("cutlery").value,
  comment:document.getElementById("comment").value,
  cart
 };

 fetch(WEBHOOK,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(data)
 });

 alert("Замовлення відправлено");
 location.reload();
}

function openContacts(){
 alert("Instagram + карта + 10:00-21:00");
}

render();
