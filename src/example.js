export const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Panadería El Buen Pan — Pan artesano en Madrid</title>
<meta name="description" content="Pan artesano de masa madre horneado cada mañana en Madrid. Pedidos online y recogida en tienda.">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="https://elbuenpan.example/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<meta property="og:title" content="Panadería El Buen Pan">
<meta property="og:description" content="Pan artesano de masa madre en Madrid">
<meta property="og:image" content="https://elbuenpan.example/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Bakery","name":"El Buen Pan","telephone":"+34910000000"}
<\/script>
<style>body{font-family:sans-serif;color:#2b2b2b;background:#f7f2ea;} .accent{color:#c1440e;}</style>
</head>
<body>
<!-- TODO: revisar precios antes de publicar -->
<h1>Panadería El Buen Pan</h1>
<h3>Nuestros productos</h3>
<img src="/pan.jpg" width="400" height="300">
<h2>Sobre nosotros</h2>
<p>Contacto: hola@elbuenpan.example o llámanos al 910 000 000.</p>
<table>
<tr><th>Producto</th><th>Precio</th></tr>
<tr><td>Hogaza masa madre</td><td>4,50€</td></tr>
<tr><td>Baguette</td><td>1,80€</td></tr>
</table>
<form action="/pedido" method="POST">
<input type="text" name="nombre" placeholder="Tu nombre" required>
<input type="email" name="email" placeholder="Tu email">
<button type="submit">Enviar pedido</button>
</form>
<a href="/carta" rel="nofollow">Ver carta completa</a>
<a href="https://instagram.com/elbuenpan" target="_blank">Instagram</a>
<script src="/analytics.js" async><\/script>
</body>
</html>`;

export const EXAMPLE_HTML_B = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Panadería El Buen Pan — Pan artesano y bollería en Madrid</title>
<meta name="description" content="Pan artesano de masa madre y bollería recién horneada cada mañana en Madrid. Pedidos online, recogida en tienda y envío a domicilio.">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="https://elbuenpan.example/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<meta property="og:title" content="Panadería El Buen Pan">
<meta property="og:description" content="Pan artesano y bollería en Madrid">
<meta property="og:image" content="https://elbuenpan.example/og-v2.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Bakery","name":"El Buen Pan","telephone":"+34910000001"}
<\/script>
<style>body{font-family:sans-serif;color:#2b2b2b;background:#f7f2ea;} .accent{color:#c1440e;}</style>
</head>
<body>
<h1>Panadería El Buen Pan</h1>
<h2>Nuestros productos</h2>
<img src="/pan.jpg" alt="Hogaza de pan de masa madre" width="400" height="300">
<img src="/bolleria.jpg" alt="Bandeja de bollería surtida" width="400" height="300">
<h2>Sobre nosotros</h2>
<p>Contacto: hola@elbuenpan.example o llámanos al 910 000 001.</p>
<table>
<tr><th>Producto</th><th>Precio</th></tr>
<tr><td>Hogaza masa madre</td><td>4,80€</td></tr>
<tr><td>Baguette</td><td>1,80€</td></tr>
<tr><td>Croissant</td><td>2,10€</td></tr>
</table>
<form action="/pedido" method="POST">
<label for="nombre">Tu nombre</label>
<input type="text" id="nombre" name="nombre" placeholder="Tu nombre" required>
<label for="email">Tu email</label>
<input type="email" id="email" name="email" placeholder="Tu email">
<button type="submit">Enviar pedido</button>
</form>
<a href="/carta" rel="nofollow">Ver carta completa</a>
<a href="/envios">Envío a domicilio</a>
<a href="https://instagram.com/elbuenpan" target="_blank">Instagram</a>
<script src="/analytics.js" async><\/script>
</body>
</html>`;
