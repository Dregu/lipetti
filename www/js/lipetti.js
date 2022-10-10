var data = window.localStorage;
var url = 'http://backend/index.php';
var money = 0;
var total = 0;
var custom = 0;
var add = 0;
var cart = [];
var menu = [];
var processing = false;

document.addEventListener("backbutton", function(e){
	if($.mobile.activePage.attr('id') != 'shopPage') {
		e.preventDefault();
	} else if(total == 0 || confirm('Ostoskorissa on myymättömiä tuotteita!\n\n[OK] heittää tuotteet bittitaivaaseen\n[Cancel] palaa takaisin myymiöön.')) {
		$.mobile.changePage('#homePage', {transition: 'flip', reverse: true});
	}
}, false);

function tag(uid) {
	console.log(uid);
	if(data.getItem('user') == undefined) {
		login();
		return;
	}
	if(data.getItem('current') == uid && $.mobile.activePage.attr('id') != 'homePage' && $.mobile.activePage.attr('id') != 'newPage') {
		return;
	}
	$('.status').html('Haetaan kortin tietoja...');
	data.setItem('current', uid);
	$.get(url+'?info='+encodeURIComponent(uid))
	.done(function(response) {
		openShop(response);
	})
	.fail(function(response) {
		if(data.getItem('admin') == '1') {
			$('#newTag').html(uid);
			$.mobile.changePage('#newPage', {transition: 'flip'});
		} else {
			alert('Tuntematon tagi.');
		}
	})
	.always(function(response) {
		$('.status').html('Lue kortti...');
	});
}

function login() {
	if(data.getItem('user') == undefined) {
		$('#user').val('');
		$('#pass').val('');
		$('#mode').attr("checked",false).checkboxradio("refresh");
		$('#event').val('');
		$.mobile.changePage('#loginPage', {transition: 'none'});
	} else {
		$('#logged').html(data.getItem('user')+'Shop');
		if(data.getItem('admin') == '1') {
			$('#logged').css({color: 'darkorange'});
		} else {
			$('#logged').css({color: 'black'});
		}
		menu = JSON.parse(data.getItem('menuSave'));
		if(data.getItem('admin') == '0') $('#plus').addClass('ui-disabled');
		makeMenu();
		$.mobile.changePage('#homePage', {transition: 'none'});
	}
}

$('#loginButton').bind('click', function(e) {
	e.preventDefault();
	data.clear();
	$.post(url, {user: $('#user').val(), pass: $('#pass').val(), mode: $('#mode').val(), event: $('#event').val()})
	.done(function(response) {
		data.setItem('user', $('#user').val());
		data.setItem('admin', ($('#mode').is(':checked')?1:0));
		if(!$('#mode').is(':checked')) {
			$('#plus').addClass('ui-disabled');
		} else {
			$('#plus').removeClass('ui-disabled');
		}
		data.setItem('event', $('#event').val());
		$('#logged').html($('#user').val()+'Shop');
		if(data.getItem('admin') == '1') {
			$('#logged').css({color: 'darkorange'});
		} else {
			$('#logged').css({color: 'black'});
		}
		$.mobile.changePage('#homePage', {transition: 'slidedown'});
		for(var i in response) {
			response[i].price = parseInt(response[i].price);
		}
		menu = response;
		data.setItem('menuSave', JSON.stringify(response));
		makeMenu();
	})
	.fail(function(response) {
		alert(response.responseText);
	});
});

$('#barcodeButton').bind('click', function() {
	cordova.plugins.barcodeScanner.scan(function(code) {
		if(code.cancelled || code.text == '') return;
		tag(code.text);
	}, function() {});
});

$('#newCancel').bind('click', function(e) {
	$('#newName').val('');
	$('#newUser').val('');
	$('#newPass').val('');	
});

$('#newButton').bind('click', function(e) {
	e.preventDefault();
	/*if($('#newName').val() == "" || $('#newUser').val() == "" || $('#newPass').val() == "") {
		alert('Syötä ne tiedot.');
		return;
	}*/
	$.post(url, {newName: $('#newName').val(), newUser: $('#newUser').val(), newPass: $('#newPass').val(), newUid: data.getItem('current')})
	.done(function(response) {
		tag(data.getItem('current'));
	})
	.fail(function(response) {
		alert(response.responseText);
	}).always(function() {
		$('#newName').val('');
		$('#newUser').val('');
		$('#newPass').val('');
	});
});

$('#homeButton').bind('click', function(e) {
	$('.status').html('Lue kortti...');
	if(total == 0 || confirm('Ostoskorissa on myymättömiä tuotteita!\n\n[OK] heittää tuotteet bittitaivaaseen\n[Cancel] palaa takaisin myymiöön.')) {
		$.mobile.changePage('#homePage', {transition: 'flip', reverse: true});
	}
});

$('#logoutButton').bind('click', function(e) {
	if(confirm('Oikeesti? Et voi enää myydä mitään jos kirjaudut pihalle.')) {
		$.post(url, {logout: 1});
		data.clear();
		login();
	}
});

$('#buy').bind('click', function() {
	if(processing) return;
	if(total != 0) {
		processing = true;
		if(data.getItem('hallitus') != '1' && data.getItem('admin') != '1' && total > money) {
			alert('Ei myydä velaks.');
			return;
		}
		$('#buy').addClass('ui-disabled');
		$.post(url, {sum: -total, uid: data.getItem('current')})
		.done(function(response) {
			chaching();
			$.mobile.changePage('#homePage', {transition: 'flip', reverse: true});
		})
		.fail(function(response) {
			alert(response.responseText);
		}).always(function() {
			$('#buy').removeClass('ui-disabled');
			processing = false;
		});
	}
});

$('#cash').bind('click', function() {
	$('#cash').addClass('ui-disabled');
	$.get(url+'?log='+data.getItem('current'))
		.done(function(response) {
			alert(response);
		})
		.always(function() {
			$('#cash').removeClass('ui-disabled');
		});
});

$('#plus').keyup(function() {
	add = 100*parseFloat($('#plus').val());
	if(isNaN(add)) add = 0;
	updateCart(0,0);
});

var drawing = false;
var drawmode = 1;
$('#lipetti').bind('touchstart', function(e) {
	drawing = true;
	drawmode = 1;
	if($(e.target).hasClass('checked')) {
		drawmode = 0;
	}
	check(e.target)
});

$('#lipetti').bind('touchmove', function(e) {
	if(!drawing) return;
	var orig = e.originalEvent.changedTouches[0];
	var targ = document.elementFromPoint(orig.clientX, orig.clientY);
	if($(targ).hasClass('ruutu')) check(targ);
});

$(document).bind('touchend', function() {
	if(drawing == 0) return;
	custom = 25*$('.checked').length;
	updateCart(0,0);
  drawing = 0;
});

function chaching() {
	if(typeof Media != 'function') return;
	var media = new Media('/android_asset/www/snd/cash.wav');
	media.play();
}

function openShop(info) {
	$('#customer').html(info.nimi+' ('+info.tunnus+')');
	if(info.hallitus == '1') {
		$('#customer').css({color: 'darkorange'});
	} else {
		$('#customer').css({color: 'black'});
	}
	data.setItem('hallitus', info.hallitus);
	money = parseInt(info.raha);
	setMoney(money);
	for(var i in menu) {
		cart[i] = 0;
	}
	$('.item .removeItem .ui-btn-text').html('&nbsp;');
	$('*').removeClass('checked');
	custom = 0;
	add = 0;
	$('#plus').val('');
	updateCart(0,0);
	$.mobile.changePage('#shopPage', {transition: 'flip'});		
	setMoney(money);
}

function setMoney(num) {
	$('#cash .ui-btn-text').html(num/100+'€');
	if(num <= 0) {
		$('#cash').css({color: 'orangered'});
	} else {
		$('#cash').css({color: 'white'});
	}
}

function updateCart(item, amount) {
	item = parseInt(item);
	amount = parseInt(amount);
	cart[item] += amount;
	if(cart[item] < 0 && data.getItem('admin') != '1') cart[item] = 0;
	var cost = 0;
	for(var i in cart) {
		var current = cart[i];
		if(current != 0) {
			cost+=1*current*menu[i].price;
		}
	}
	var current = cart[item];
	if(current != 0) {
		$('.item[data-item='+item+'] .removeItem .ui-btn-text').html(current);
	} else {
		$('.item[data-item='+item+'] .removeItem .ui-btn-text').html('&nbsp;');
	}
	setMoney(money-cost-custom+add);
	total = cost+custom-add;
	if(total != 0) {
		$('#buy').removeClass('ui-disabled');
	} else if(!$('#buy').hasClass('ui-disabled')) {
		$('#buy').addClass('ui-disabled');
	}
	$('#total').html('Veloitus: '+(parseInt(total)/100)+'€');
}

function makeMenu() {
	$('#items').html("");
	for(var i in menu) {
		var item = menu[i];
		$('#items').append("<div data-role='controlgroup' data-type='horizontal' class='item' data-prince='"+item.price+"' data-item='"+i+"'><a href='#' data-role='button' class='removeItem' data-icon='minus-sign' data-iconpos='left' data-theme='c'>&nbsp;</a><a href='#' data-role='button' class='addItem' data-icon='plus-sign' data-iconpos='right' data-theme='c'><span class='price'>"+(item.price/100)+"€</span>"+item.name+"</a></div>").trigger('create');
	}
	$('.removeItem').bind('vmousedown', function() {
		updateCart($(this).parents('.item').attr('data-item'), -1);
	});
	$('.addItem').bind('vmousedown', function() {
		updateCart($(this).parents('.item').attr('data-item'), 1);
	});
}

function check(targ) {
	if($(targ).hasClass('ruutu')) {
		if(drawmode == 1) {
			$(targ).addClass('checked');
		} else {
			$(targ).removeClass('checked');
		}
		//custom = 25*$('.checked').length;
		//updateCart(0,0);
	}
}

document.body.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, false); 

$('#user').click(function() {
	$(this).focus();
})

$('#loginPage').on('pageshow pageinit', function() {
	$('#user').click();
});
