function $$(s) {
    return document.getElementById(s);
}

function output(s) {
	try {
		$$('output').innerHTML += s + '<br/>';
		$('#output').scrollTop($('#output').prop("scrollHeight"));
	} catch (error) {
		//alert(error.message + '\n' + s);
    }
}


/************************************************* global variables ***********************************************************/

var gwidth, gheight;

var jqxhr;

var context, contextw, contexth; //context, width, height
var NX = 4; //4 columns
var NY = 6; //6 rows

var D1, D2; //array of points, D1=raw, D2=fit
var DN = 0; //number of valid points
var D1xmin, D1xmax, D1ymin, D1ymax;
var D1x1, D1x2, D1y1, D1y2, D1triangle = false; //for gradient triangle

var X0 = -2, DX = 1, Y0 = -3, DY = 1; //for scale
var XP, XQ, YP, YQ; //for dp

var LM, LB; //best-fit
var LA, LC; //quadratic fit
var LD; //cubic fit

// MUST change the variables below for change in pixels of the graph.

var numpixel = 10;
//var numpixel = 57; // number of pixel for each small square.

var MX = 50, MY = 50, PX = 100; //margin left, top, big square pixels
//var MX = 50*math.floor((math.pow(numpixel/10,0.8))), MY = 50*math.floor((math.pow(numpixel/10,0.6))), PX = 10*numpixel; //margin left, top, big square pixels


/************************************************* preready functions *********************************************************/

function windowresize() {
	gwidth = document.documentElement.offsetWidth;
	gheight = document.documentElement.offsetHeight;
	output('gwidth = ' + gwidth + ', gheight = ' + gheight);
}


/************************************************* ready **********************************************************************/

$(document).ready(function() {
    //alert("hi");

	$(window).on('resize', windowresize);
	windowresize();

	init();

	$('#tb11').focus();

});


function init() {

	context = document.getElementById('canvas').getContext('2d');

	$('#fgraphsize').on('change', function() {
		graphsizechange();
	});

	$('#fgraphsizecustomise').on('change', function() {
		graphsizechange();
	});

	$('#fgraphsizex').on('input change', function() {
		graphsizechange();
	});

	$('#fgraphsizey').on('input change', function() {
		graphsizechange();
	});

	$('.datavalue').on('change', function() {
		doshowplot();
	});
	
	$('#fplotpoints').on('change', function() {
		plotpointschange();
	});

	$('#fautoscale').on('change', function() {
		autoscalechange();
	});
	
	$('.scalevalue').on('change', function() {
		scalevaluechange();
	});
	
	$('#fdrawminorgridlines').on('change', function() {
		drawminorgridlineschange();
	});

	$('#fdrawmajorgridlines').on('change', function() {
		drawmajorgridlineschange();
	});

	$('#fdrawaxes').on('change', function() {
		drawaxeschange();
	});

	$('#fdrawaxesarrow').on('change', function() {
		drawaxesarrowchange();
	});

	$('#fdrawticks').on('change', function() {
		drawtickschange();
	});

	$('#fmarkaxes').on('change', function() {
		markaxeschange();
	});
	
	$('#fzoomslider').on('input change', function() {
		zoomsliderchange();
	});

	$('#ffittype').on('change', function() {
		fittypechange();
	});


	$('#fshowequation').on('change', function() {
		showequationchange();
	});

	$('#fdrawfit').on('change', function() {
		drawfitchange();
	});

	$('#fdrawtriangle').on('change', function() {
		drawtrianglechange();
	});
	
	$('#fdrawequation').on('change', function() {
		drawgraph();
	});

	initgraph();

	drawgraph();

	document.getElementById('download').addEventListener('click', function() {
		//increases the pixels of the graph before downloading as PNG, then resize back.
		//var numpixel = 10;
		numpixel = 31.25; //=300/96 //60; // number of pixel for each small square.
		//var MX = 50*math.floor((math.pow(numpixel/10,0.8))), MY = 50*math.floor((math.pow(numpixel/10,0.6))), PX = 10*numpixel; //margin left, top, big square pixels
		MX = 5*numpixel, MY = 5*numpixel, PX = 10*numpixel; //margin left, top, big square pixels
		initgraph();
		drawgraph();
		this.href = document.getElementById('canvas').toDataURL();
		this.download = 'graph.png';
		numpixel = 10;
		MX = 50, MY = 50, PX = 100; //margin left, top, big square pixels
		initgraph();
		drawgraph();
	}, false);

	document.getElementById('downloadsvg').addEventListener('click', function() {
		//context.fillStyle="red";
		//context.fillRect(100,100,100,100);
		numpixel = 10; //9.6; //using 96dpi as convention //10
		MX = 50, MY = 50, PX = 100; //margin left, top, big square pixels
		initgraph();
		var oldcontext = context;
		context = new C2S(contextw+10*numpixel, contexth+10*numpixel);
		drawgraph();
		var svg = context.getSerializedSvg(true);
		//alert(svg);
		var dataurl = 'data:image/svg+xml,' + encodeURIComponent(svg);
		//output(svg);
		this.href = dataurl;
		this.download = 'graph.svg';
		context = oldcontext;
		initgraph();
		drawgraph();
	}, false);

}

function initgraph() {
	contextw = NX * numpixel* 10;
	contexth = NY * numpixel* 10;

	$('#canvas').attr('width', contextw+100*numpixel/10);
	$('#canvas').attr('height', contexth+100*numpixel/10);
}



/************************************************* graph **********************************************************************/

function drawgraph() {

	context.clearRect(0, 0, contextw+100*numpixel/10, contexth+100*numpixel/10);

	context.lineWidth = 2*numpixel; //10;
	context.strokeStyle = '#000';
	context.setLineDash([]);
	context.fillStyle = 'black';
	context.font = 20*numpixel/10+'px arial';

	drawgrids();
	drawline();
	drawpoints();
	drawequation();

}

function getdp(n) {
	//return -Math.floor(Math.log(n));
	//output('n = ' + n);
	var np = (n + '').split(".");
	if (np.length == 1) return 0;
	var dp = np[1];
	//output('dp = ' + dp);
	return dp.length;
	//return n.length > 1 ? -(n + '').split(".")[1].length : 0;
}

function drawgrids() {

	var XX;
	var YY;
	
	XP = getdp(DX);
	if (getdp(X0) > XP) xP = getdp(X0);
	
	YP = getdp(DY);
	if (getdp(Y0) > YP) YP = getdp(Y0);

	context.setLineDash([]);

	//draw gridlines
	if ($('#fdrawminorgridlines').prop('checked')) {
	//minor axes
	context.lineWidth = 0.5*numpixel/10;
	context.strokeStyle = '#444';
	context.beginPath();
	var cutefactor;
	cutefactor = 2	;
	invcutefactor = 10/cutefactor;
	numpixel = numpixel*cutefactor; //added 15Feb22
	
	for (var i = 0; i <= NY*invcutefactor*2; i += 1) {
		context.moveTo(MX, MY+i*numpixel/2+0.5); context.lineTo(MX+NX*numpixel*invcutefactor+0.5, MY+i*numpixel/2+0.5);
	}
	for (var i = 0; i <= NX*invcutefactor*2; i += 1) {
		context.moveTo(MX+i*numpixel/2+0.5, MY+0.5); context.lineTo(MX+i*numpixel/2+0.5, MY+NY*numpixel*invcutefactor+0.5);
	}
	context.stroke();
		numpixel = numpixel/cutefactor; //added 15Feb22
	//half axes
	context.lineWidth = 0.6667*numpixel/10; //0.7
	context.strokeStyle = '#444'; //'#222';
	context.beginPath();
	for (var i = 0; i <= NY*2; i += 1) {
		context.moveTo(MX, MY+i*numpixel/2*10+0.5); context.lineTo(MX+NX*numpixel*10+0.5, MY+i*numpixel/2*10+0.5);
	}
	for (var i = 0; i <= NX*2; i += 1) {
		context.moveTo(MX+i*numpixel/2*10+0.5, MY+0.5); context.lineTo(MX+i*numpixel/2*10+0.5, MY+NY*numpixel*10+0.5);
	}
	context.stroke();
	}

	//main black axes
	context.lineWidth = 1*numpixel/10;
	context.strokeStyle = '#000';
	context.beginPath();
	for (var i = 0; i <= NY; i += 1) {
		//if ($('#fdrawmajorgridlines').prop('checked')) {
		if (($('#fdrawmajorgridlines').prop('checked')) || ($('#fdrawaxes').prop('checked') && i == NY)) {
			context.moveTo(MX, MY+i*numpixel*10+0.5); context.lineTo(MX+NX*numpixel*10+0.5, MY+i*numpixel*10+0.5);
		}
		if ($('#fdrawticks').prop('checked')) {
			context.moveTo(MX-0.03*numpixel*10, MY+i*numpixel*10+0.5); context.lineTo(MX, MY+i*numpixel*10+0.5);
		}
	}
	for (var i = 0; i <= NX; i += 1) {
		if (($('#fdrawmajorgridlines').prop('checked')) || ($('#fdrawaxes').prop('checked') && i == 0)) {
			context.moveTo(MX+i*numpixel*10+0.5, MY); context.lineTo(MX+i*numpixel*10+0.5, MY+NY*numpixel*10);
		}
		if ($('#fdrawticks').prop('checked')) {
			context.moveTo(MX+i*numpixel*10+0.5, MY+NY*numpixel*10); context.lineTo(MX+i*numpixel*10+0.5, MY+(NY+0.035)*numpixel*10);
		}
	}
	context.stroke();

	//mark axes
	if ($('#fmarkaxes').prop('checked')) {
	context.lineWidth = 1*numpixel/10;
	context.strokeStyle = '#000';
	context.font = 1.88*numpixel+'px arial';
	context.beginPath();
	context.textAlign = 'right';
	for (var i = 0; i <= NY; i += 1) {
			YY = (Y0 + (NY-i)*DY).toFixed(YP);
			context.fillText(YY, MX-0.7*numpixel, MY+i*numpixel*10+0.7*numpixel);
	}
	context.textAlign = 'center';
	for (var i = 0; i <= NX; i += 1) {
			XX = (X0 + i*DX).toFixed(XP);
			context.fillText(XX, MX+i*numpixel*10, NY*numpixel*10+MY+2.4*numpixel);
	}
	}

	//draw axes arrowhead
	if ($('#fdrawaxesarrow').prop('checked')) {
		context.beginPath();
		context.moveTo(MX, MY+NY*numpixel*10+0.5); context.lineTo(MX+NX*numpixel*10+0.5, MY+NY*numpixel*10+0.5);
		context.lineTo(MX+(NX-0.15)*numpixel*10+0.5, MY+(NY+0.05)*numpixel*10+0.5); 
		context.lineTo(MX+(NX-0.15)*numpixel*10+0.5, MY+(NY-0.05)*numpixel*10+0.5);
		context.lineTo(MX+NX*numpixel*10+0.5, MY+NY*numpixel*10+0.5);
		context.closePath();
		context.fill();
		context.beginPath();
		context.moveTo(MX+0.5, MY+NY*numpixel*10); context.lineTo(MX+0.5, MY);
		context.lineTo(MX-0.05*numpixel*10+0.5, MY+0.15*numpixel*10);
		context.lineTo(MX+0.05*numpixel*10+0.5, MY+0.15*numpixel*10);
		context.lineTo(MX+0.5, MY);
		context.closePath();
		context.fill();
	}

}

function xtoSX(x) {
	return MX + (x - X0) * numpixel * 10 / DX;
}

function ytoSY(y) {
	return MY + NY * numpixel*10 - (y - Y0) * numpixel*10 / DY;
}

function drawline() {

	context.strokeStyle = '#000'; //'#449';
	context.lineWidth = 1*numpixel/5; //10;
	context.setLineDash([]);

	//if (DN < 2) return;
	if ((Number($('#ffittype').val()) < 20 && DN < 2)
		|| (Number($('#ffittype').val()) == 21 && DN < 3)
		|| (Number($('#ffittype').val()) == 31 && DN < 4)
		) return; //not enough points

	if ($('#fshowequation').prop('checked')) {
		var equationstr = '';
		equationstr += 'y = ';
		if ($('#ffittype').val() == '1') { //linear
			equationstr += LM.toFixed(4) + ' x';
			equationstr += (LB >= 0) ? ' + ' + LB.toFixed(4) : ' - ' + Math.abs(LB).toFixed(4);
		} else if ($('#ffittype').val() == '2') { //power
			equationstr += Math.exp(LB).toFixed(4) + ' x ^ ';
			equationstr += LM.toFixed(4);
		} else if ($('#ffittype').val() == '3') { //exponential
			equationstr += Math.exp(LB).toFixed(4) + ' e ^ (';
			equationstr += LM.toFixed(4) + ' x)';
		} else if ($('#ffittype').val() == '4') { //logarithmic
			equationstr += LM.toFixed(4) + ' ln x ';
			equationstr += (LB >= 0) ? ' + ' + LB.toFixed(4) : ' - ' + Math.abs(LB).toFixed(4);
		} else if ($('#ffittype').val() == '21') { //quadratic
			equationstr += LA.toFixed(4) + ' x^2 ';
			equationstr += (LB >= 0 ? ' + ' : ' - ') + Math.abs(LB).toFixed(4) + ' x ';
			equationstr += (LC >= 0 ? ' + ' : ' - ') + Math.abs(LC).toFixed(4);
		} else if ($('#ffittype').val() == '31') { //cubic
			equationstr += LA.toFixed(4) + ' x^3 ';
			equationstr += (LB >= 0 ? ' + ' : ' - ') + Math.abs(LB).toFixed(4) + ' x^2 ';
			equationstr += (LC >= 0 ? ' + ' : ' - ') + Math.abs(LC).toFixed(4) + ' x ';
			equationstr += (LD >= 0 ? ' + ' : ' - ') + Math.abs(LD).toFixed(4);
		}
		//context.beginPath();
		context.fillStyle = '#44f';
		context.fillText(equationstr, MX+NX*numpixel*10/2, MY+NY*numpixel*10+4.2*numpixel);
		//context.stroke();
	}

	if (!$('#fdrawfit').prop('checked')) return;

	//draw best fit line/curve
	if ($('#ffittype').val() == '1') { //linear

		var x1 = X0;
		var y1 = LM*x1 + LB;
		if (LM > 0 && y1 < Y0) {
			y1 = Y0;
			x1 = (y1 - LB)/LM;
		} else if (LM < 0 && y1 > Y0 + NY*DY) {
			y1 = Y0 + NY*DY;
			x1 = (y1 - LB)/LM;
		}
		var x2 = X0 + NX*DX;
		var y2 = LM*x2 + LB;
		if (LM > 0 && y2 > Y0 + NY*DY) {
			y2 = Y0 + NY*DY;
			x2 = (y2 - LB)/LM;
		} else if (LM < 0 && y2 < Y0) {
			y2 = Y0;
			x2 = (y2 - LB)/LM;
		}
		var SX1 = xtoSX(x1);
		var SY1 = ytoSY(y1);
		var SX2 = xtoSX(x2);
		var SY2 = ytoSY(y2);
		context.beginPath();
		context.moveTo(xtoSX(x1)+0.05*numpixel, ytoSY(y1)+0.05*numpixel); context.lineTo(xtoSX(x2)+0.05*numpixel, ytoSY(y2)+0.05*numpixel);
		context.stroke();

	}  else if ($('#ffittype').val() != '1') { //curve

		var a, b, x;
		a = Math.exp(LB);
		b = LM;
		context.beginPath();
		for (i = 0; i <= NX*numpixel*2; i++) {
			x = X0 + i*DX/10/10; //15Feb22, changed from DX/10/2
			if ($('#ffittype').val() == '2') { //power
				y = a*Math.pow(x, b);
			} else if ($('#ffittype').val() == '3') { //exponential
				y = a*Math.exp(b*x);
			} else if ($('#ffittype').val() == '4') { //logarithmic
				y = LM*Math.log(x) + LB;
			} else if ($('#ffittype').val() == '21') { //quadratic
				y = LA*x*x + LB*x + LC;
			} else if ($('#ffittype').val() == '31') { //quadratic
				y = LA*x*x*x + LB*x*x + LC*x + LD;
			}
			//if (i > 0) context.lineTo(xtoSX(x)+0.5, ytoSY(y)+0.5); else context.moveTo(xtoSX(x)+0.5, ytoSY(y)+0.5);
			if (y >= Y0 - DY/50 && y <= Y0 + NY*DY + DY/50)
			//if (y >= Y0 && y <= Y0 + NY*DY)
			context.lineTo(xtoSX(x)+0.05*numpixel, ytoSY(y)+0.05*numpixel);
		}
		//context.lineTo(xtoSX(x2)+0.5, ytoSY(y2)+0.5);
		context.stroke();
	}

	//draw gradient triangle
	if ($('#ffittype').val() != '1') return; //not linear fit
	if (!D1triangle) return; //no triangle found
	if ($('#fdrawtriangle').prop('checked')) {
		//half smallest square dp
		var XQ = getdp((DX/20).toPrecision(1));
		var YQ = getdp((DY/20).toPrecision(1));
		//draw gradient triangle with linewidth = 2
		context.strokeStyle = '#99f'; //'#44f';
		context.lineWidth = 2*numpixel/10;
		context.setLineDash([5, 5]);
		//context.font = 'bold 12px arial';
		context.font = 20*numpixel/10+'px arial';
		context.fillStyle = '#44f';
		context.beginPath();
		if (LM > 0) {
			context.moveTo(xtoSX(D1x1)+0.05*numpixel, ytoSY(D1y1)+0.05*numpixel); context.lineTo(xtoSX(D1x2)+0.05*numpixel, ytoSY(D1y1)+0.05*numpixel);
			context.moveTo(xtoSX(D1x2)+0.05*numpixel, ytoSY(D1y2)+0.05*numpixel); context.lineTo(xtoSX(D1x2)+0.05*numpixel, ytoSY(D1y1)+0.05*numpixel);
		} else {
			context.moveTo(xtoSX(D1x1)+0.05*numpixel, ytoSY(D1y1)+0.05*numpixel); context.lineTo(xtoSX(D1x1)+0.05*numpixel, ytoSY(D1y2)+0.05*numpixel);
			context.moveTo(xtoSX(D1x2)+0.05*numpixel, ytoSY(D1y2)+0.05*numpixel); context.lineTo(xtoSX(D1x1)+0.05*numpixel, ytoSY(D1y2)+0.05*numpixel);
		}
		context.stroke();
		context.textAlign = 'left';
		context.fillText('(' + D1x1.toFixed(XQ) + ', ' + D1y1.toFixed(YQ) + ')', xtoSX(D1x1), ytoSY(D1y1)+(LM > 0 ? 2*numpixel : -0.5*numpixel));
		context.textAlign = 'right';
		context.fillText('(' + D1x2.toFixed(XQ) + ', ' + D1y2.toFixed(YQ) + ')', xtoSX(D1x2), ytoSY(D1y2)-(LM > 0 ? 0.5*numpixel : -2*numpixel));
	}

}

function drawpoints() {

	if (DN == 0) return;
	if (!$('#fplotpoints').prop('checked')) return;

	//context.strokeStyle = '#f44';
	context.strokeStyle = '#444';
	context.lineWidth = 1*numpixel/10;
	context.setLineDash([]);

	var x, y, SX, SY;
	for (var i = 0; i < DN; i++) {
		//output(i + ': ' + D1[i] + ' = ' + D1[i][0]);
		x = D1[i][0]; y = D1[i][1];
		//output('y = ' + y);
		SX = MX + (x - X0) * numpixel * 10 / DX;
		//output('SX = ' + SX);
		SY = MY + NY * numpixel * 10 - (y - Y0) * numpixel * 10 / DY;
		//output('SX = ' + SX + ', SY = ' + SY);
		context.beginPath();
		//context.arc(SX+0.5, SY+0.5, 5, 0, 2*Math.PI, true); //plot hollow circle
		//plot cross
		context.moveTo(SX+0.05*numpixel-numpixel/2, SY+0.05*numpixel-numpixel/2); context.lineTo(SX+0.05*numpixel+numpixel/2, SY+0.05*numpixel+numpixel/2);
		context.moveTo(SX+0.05*numpixel-numpixel/2, SY+0.05*numpixel+numpixel/2); context.lineTo(SX+0.05*numpixel+numpixel/2, SY+0.05*numpixel-numpixel/2);
		context.stroke();
	}
}

function dogetdata() {
	var srcs = 'tb';
    var xmin, xmax, ymin, ymax;
    var d1 = [];
    var d2 = [];
    var x, y;
    var sumx = 0, sumy = 0, sumxx = 0, sumyy = 0, sumxy = 0; //for first order fit
    var sumxxx = 0, sumxxxx = 0, sumxxy = 0; //for quadratic
    var sumxxxxx = 0, sumxxxxxx = 0, sumxxxy = 0; //for cubic
    var n = 0;
    //for (var i = 1; i <= 6; i++) {
    for (var i = 1; i <= 8; i++) {
        //x = parseFloat($$("tb"+i+"1").value);
        x = parseFloat($$(srcs+i+"1").value);
        //y = parseFloat($$("tb"+i+"4").value);
        y = parseFloat($$(srcs+i+"2").value);
        //alert('x = ' + x + '   y = ' + y);
        if (isNaN(x) || isNaN(y)) continue;
        d1.push([x, y]);
        n++;
        if (n == 1) { //first point
			xmin = x; xmax = x; ymin = y; ymax = y;
        } else {
			if (x < xmin) xmin = x; else if (x > xmax) xmax = x;
			if (y < ymin) ymin = y; else if (y > ymax) ymax = y;
        }
        
        if ($('#ffittype').val() == '1') {
			sumx += x;
			sumy += y;
			sumxx += x*x;
			sumxy += x*y;
			sumyy += y*y;
		} else if ($('#ffittype').val() == '2') { //power
			sumx += Math.log(x);
			sumy += Math.log(y);
			sumxx += Math.log(x)*Math.log(x);
			sumxy += Math.log(x)*Math.log(y);
			sumyy += Math.log(y)*Math.log(y);
		} else if ($('#ffittype').val() == '3') { //exponential
			sumx += x;
			sumy += Math.log(y);
			sumxx += x*x;
			sumxy += x*Math.log(y);
			sumyy += Math.log(y)*Math.log(y);
		} else if ($('#ffittype').val() == '4') { //logarithmic
			sumx += Math.log(x);
			sumy += y;
			sumxx += Math.log(x)*Math.log(x);
			sumxy += Math.log(x)*y;
			sumyy += y*y;
		} else if ($('#ffittype').val() == '21') { //quadratic
			sumx += x;
			sumy += y;
			sumxx += x*x;
			sumxy += x*y;
			sumyy += y*y;
			sumxxx += x*x*x;
			sumxxxx += x*x*x*x;
			sumxxy += x*x*y;
		} else if ($('#ffittype').val() == '31') { //quadratic
			sumx += x;
			sumy += y;
			sumxx += x*x;
			sumxy += x*y;
			sumyy += y*y;
			sumxxx += x*x*x;
			sumxxxx += x*x*x*x;
			sumxxxxx += x*x*x*x*x;
			sumxxxxxx += x*x*x*x*x*x;
			sumxxy += x*x*y;
			sumxxxy += x*x*x*y;
		}

    }

	//best-fit line
    if (n >= 2 && Number($('#ffittype').val()) < 20) { //first order fit

        var m = (n*sumxy - sumx*sumy) / (n*sumxx - sumx*sumx);
        var b = (sumy/n) - (m*sumx)/n;
        LM = m;
        LB = b;
        for (i = 0; i < n; i++) {
            x = d1[i][0];
            y = m*x + b;
            d2.push([x, y]);
        }
		var SXY = sumxy - sumx*sumy/n;
		var SXX = sumxx - sumx*sumx/n;
		var SYY = sumyy - sumy*sumy/n;
        var r2 = SXY*SXY / (SXX*SYY);
		var c2str = 'Y &nbsp; = &nbsp; ';
		c2str += m.toFixed(3) + ' X ';
		c2str += (b >= 0) ? '&nbsp; + &nbsp; ' : '&nbsp; &minus; &nbsp; ';
		c2str += Math.abs(b).toFixed(3); 
        $('#resultc2').html(c2str);
        var c3str = '';
        //c3str += 'Fit ';
        if (r2 >= 0.9995) c3str += '100';
        else c3str += (r2*100).toFixed(1);
        c3str += '%';
        //c3str += ' Fit';
        c3str += '&nbsp;';
        $('#resultc3').html(c3str);

		var fitanswerstr = '';
		//fitanswerstr += 'm = ' + m.toFixed(3) + '<br/>';
		//fitanswerstr += 'c = ' + b.toFixed(3) + '<br/>';
		fitanswerstr += 'Correlation r<sup>2</sup> = ' + r2.toFixed(4);
		//fitanswerstr += 'Correlation r&sup2; = ' + r2.toFixed(3);
        $('#fitanswer').html(fitanswerstr);

	} else if (n >= 3 && $('#ffittype').val() == '21') { //quadratic

		var fitanswerstr = '';
		//fitanswerstr += 'quadratic';
		var A = [[n, sumx, sumxx], [sumx, sumxx, sumxxx], [sumxx, sumxxx, sumxxxx]];
		var Y = [[sumy], [sumxy], [sumxxy]];
		var AI = math.inv(A);
		var X = math.multiply(AI, Y);
		LC = X[0][0];
		LB = X[1][0];
		LA = X[2][0];
        $('#fitanswer').html(fitanswerstr);

	} else if (n >= 4 && $('#ffittype').val() == '31') { //cubic

		var fitanswerstr = '';
		//fitanswerstr += 'cubic';
		var A = [[n, sumx, sumxx, sumxxx], [sumx, sumxx, sumxxx, sumxxxx], [sumxx, sumxxx, sumxxxx, sumxxxxx], [sumxxx, sumxxxx, sumxxxxx, sumxxxxxx]];
		var Y = [[sumy], [sumxy], [sumxxy], [sumxxxy]];
		var AI = math.inv(A);
		var X = math.multiply(AI, Y);
		LD = X[0][0];
		LC = X[1][0];
		LB = X[2][0];
		LA = X[3][0];
        $('#fitanswer').html(fitanswerstr);

    } else {
    
		$('#fitanswer').html('');
    
    }

	D1 = d1;
	D2 = d2;
	DN = n;
	D1xmin = xmin; D1xmax = xmax; D1ymin = ymin; D1ymax = ymax;
}

function dogettriangle() {

	if (DN < 2) return;
	if ($('#ffittype').val() != '1') return;

	D1triangle = false;

	var frac, found;

	//D1x1 = X0 + DX/2;
	//D1y1 = LM*D1x1 + LB;

	var Ymax = Y0 + NY*DY;
	
	found = false;
	for (i = 0; i <= NX*10; i++) {
		D1x1 = X0 + i*DX/10;
		D1y1 = LM*D1x1 + LB;
		if (D1y1 < Y0 || D1y1 > Ymax) continue;
		frac = (D1y1*20/DY) % 1;
		//output(D1x1.toFixed(3) + ' ' + D1y1.toFixed(3) + ' ' + frac.toFixed(3));
		if (frac < 0.25 || frac > 0.75) { found = true; break; }
	}
	if (!found) return;

	//D1x2 = X0 + NX*DX - DX/2;
	//D1y2 = LM*D1x2 + LB;

	found = false;
	for (i = NX*10; i >= 0; i--) {
		D1x2 = X0 + i*DX/10;
		D1y2 = LM*D1x2 + LB;
		if (D1y2 < Y0 || D1y2 > Ymax) continue;
		frac = (D1y2*20/DY) % 1;
		if (frac < 0.25 || frac > 0.75) { found = true; break; }
	}
	if (!found) return;
	
	if ((D1x2 - D1x1)/DX < NX/4) return; //ideally NX/2
	
	D1triangle = true;

	//output('D1x1 = ' + D1x1 + ', D1y1 = ' + D1y1);
	//output('D1x2 = ' + D1x2 + ', D1y2 = ' + D1y2);

}

function doshowplot(srcs, dsts) {
    //if (s == "") s = "tb";
    //alert(s); undefined
    if (srcs == undefined) srcs = "tb"; //alert("it undefined");
    if (dsts == undefined) dsts = "placeholder";
    //alert(srcs);
    
	dogetdata();
	doautoscale();
	drawgraph();

}

function dosetscale() { doautoscale(); }

function doautoscale() {

	if (!$('#fautoscale').prop('checked')) return;

	if (DN == 0) {

		X0 = -NX/2; DX = 1;
		Y0 = -NY/2; DY = 1;

	} else if (DN == 1) {

		X0 = Math.floor(D1xmin) - NX/2; DX = 1;
		Y0 = Math.floor(D1ymin) - NY/2; DY = 1;

	} else if (DN > 1) {

		var dp;
		var xmin = D1xmin, xmax = D1xmax, ymin = D1ymin, ymax = D1ymax;
		var h;

		//output('xmin = ' + xmin);
		//output('xmax = ' + xmax);
		var dx = (xmax - xmin) / NX;
		if (dx > 10000) dx = 10000;
		else { h = 0.0001; while (h < dx) h = nextinterval(h); dx = h; }

		X0 = Math.floor(xmin/dx)*dx;
		if (X0 + NX*dx < xmax) {
			dx = nextinterval(dx);
			X0 = Math.floor(xmin/dx)*dx;
		}

		DX = dx;
		//XP = dp;
		//output('X0 = ' + X0 + ', DX = ' + DX);

		var dy = (ymax - ymin) / NY;
		if (dy > 10000) dy = 10000;
		else { h = 0.0001; while (h < dy) h = nextinterval(h); dy = h; }

		Y0 = Math.floor(ymin/dy)*dy;
		//if (Y0 + NY*dy < ymax) Y0 += Math.ceil(ymax - Y0 - NY*dy) //check
		if (Y0 + NY*dy < ymax) {
			dy = nextinterval(dy);
			Y0 = Math.floor(ymin/dy)*dy;
		}
		
		DY = dy;
		//YP = dp;
		//output('Y0 = ' + Y0 + ', DY = ' + DY);

		dogettriangle();

	}

	$('#fscalex0').val(X0);
	$('#fscaledx').val(DX);
	$('#fscaley0').val(Y0);
	$('#fscaledy').val(DY);

}


function nextinterval(h) {
	if (h <= 0.0001) return 0.0002;
	else if (h <= 0.0002) return 0.00025;
	else if (h <= 0.00025) return 0.0004;
	else if (h <= 0.0004) return 0.0005;
	else if (h <= 0.0005) return 0.001;
	else if (h <= 0.001) return 0.002;
	else if (h <= 0.002) return 0.0025;
	else if (h <= 0.0025) return 0.004;
	else if (h <= 0.004) return 0.005;
	else if (h <= 0.005) return 0.01;
	else if (h <= 0.01) return 0.02;
	else if (h <= 0.02) return 0.025;
	else if (h <= 0.025) return 0.04;
	else if (h <= 0.04) return 0.05;
	else if (h <= 0.05) return 0.1;
	else if (h <= 0.1) return 0.2;
	else if (h <= 0.2) return 0.25;
	else if (h <= 0.25) return 0.4;
	else if (h <= 0.4) return 0.5;
	else if (h <= 0.5) return 1;
	else if (h <= 1) return 2;
	else if (h <= 2) return 2.5;
	else if (h <= 2.5) return 4;
	else if (h <= 4) return 5;
	else if (h <= 5) return 10;
	else if (h <= 10) return 20;
	else if (h <= 20) return 25;
	else if (h <= 25) return 40;
	else if (h <= 40) return 50;
	else if (h <= 50) return 100;
	else if (h <= 100) return 200;
	else if (h <= 200) return 250;
	else if (h <= 250) return 400;
	else if (h <= 400) return 500;
	else if (h <= 500) return 1000;
	else if (h <= 1000) return 2000;
	else if (h <= 2000) return 2500;
	else if (h <= 2500) return 4000;
	else if (h <= 4000) return 5000;
	else return 10000;
}


/************************************************* change event ***************************************************************/

function graphsizechange() {
	var v = $('#fgraphsize').val();
	//output('v = ' + v);
	if ($('#fgraphsizecustomise').prop('checked')) {
		NX = Math.floor($('#fgraphsizex').val());
		NY = Math.floor($('#fgraphsizey').val());
	} else {
		if (v == "1") {
			NY = 6; NX = 4;
		} else if (v == "2") {
			NY = 4; NX = 6;
		} else if (v == "3") {
			NY = 12; NX = 8;
		} else {
			NY = Math.floor(v/10);
			NX = v % 10;
		}
	}
	initgraph();
	doautoscale();
	drawgraph();
}

function datavaluechange() {

}


function plotpointschange() {
	drawgraph();
}

function autoscalechange() {

	//output('autoscale');
	//output($('#fautoscale').prop('checked'));
	if ($('#fautoscale').prop('checked')) {
		$('#fscalex0').prop('readonly', true);
		$('#fscaledx').prop('readonly', true);
		$('#fscaley0').prop('readonly', true);
		$('#fscaledy').prop('readonly', true);
		//scalevaluechange();
		//doshowplot();
		doautoscale();
		drawgraph();		
	} else {
		$('#fscalex0').prop('readonly', false);
		$('#fscaledx').prop('readonly', false);
		$('#fscaley0').prop('readonly', false);
		$('#fscaledy').prop('readonly', false);
	}

}

function scalevaluechange() {

	X0 = parseFloat($('#fscalex0').val());
	DX = parseFloat($('#fscaledx').val());
	//output('DX = ' + DX.toFixed(0));
	//output('YP = ' + YP);
	//output('NY = ' + (Y0 + (NY-0)*DY).toFixed(YP));
	Y0 = parseFloat($('#fscaley0').val());
	DY = parseFloat($('#fscaledy').val());
	
	dogettriangle();
	drawgraph();
	
}

function drawminorgridlineschange() {
	drawgraph();
}

function drawmajorgridlineschange() {
	drawgraph();
}

function drawaxeschange() {
	drawgraph();
}

function drawaxesarrowchange() {
	drawgraph();
}

function drawtickschange() {
	drawgraph();
}

function markaxeschange() {
	drawgraph();
}

function zoomsliderchange() {
	//output('slider = ' + $('#fzoomslider').val());
	var v = Number($('#fzoomslider').val());
	switch(v) {
		case 0:
			$('#zoomspan').html('100%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(1, 1)');
			break;
		case 1:
			$('#zoomspan').html('120%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(1.2, 1.2)');
			break;
		case 2:
			$('#zoomspan').html('140%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(1.4, 1.4)');
			break;
		case 3:
			$('#zoomspan').html('160%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(1.6, 1.6)');
			break;
		case 4:
			$('#zoomspan').html('180%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(1.8, 1.8)');
			break;
		case 5:
			$('#zoomspan').html('200%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(2, 2)');
			break;
		case -1:
			$('#zoomspan').html('90%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(0.9, 0.9)');
			break;
		case -2:
			$('#zoomspan').html('80%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(0.8, 0.8)');
			break;
		case -3:
			$('#zoomspan').html('70%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(0.7, 0.7)');
			break;
		case -4:
			$('#zoomspan').html('60%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(0.6, 0.6)');
			break;
		case -5:
			$('#zoomspan').html('20%');
			$('#canvas').css('transform-origin', '0 0 0');
			$('#canvas').css('transform', 'scale(0.2, 0.2)');
			break;
		default:
	}
}

function fittypechange() {
	dogetdata();
	drawgraph();
}

function showequationchange() {
	drawgraph();
}

function drawfitchange() {
	drawgraph();
}

function drawtrianglechange() {
	drawgraph();
}

function drawequation(){
	if ($('#fdrawequation').prop('checked')) { //draw equation

		var x, y;
		//var Eq1 = "y = Math.sin(x)";
		var Eq1 = "y = "+document.getElementById("drawEq1").value;;
		context.beginPath();
		context.fillStyle = '#44f';
		//context.fillText(Eq1, MX+NX*numpixel*10/2, MY+NY*numpixel*10+4.2*numpixel); //show equation
		context.stroke();
		context.beginPath();
		for (i = 0; i <= NX*numpixel*50; i++) {			
			x = X0 + i*DX/10/50; //changed from DX/10/2, 15Feb22
			eval(Eq1);
			//Math.sin(x);
			//if (i > 0) context.lineTo(xtoSX(x)+0.5, ytoSY(y)+0.5); else context.moveTo(xtoSX(x)+0.5, ytoSY(y)+0.5);
			//if (y >= Y0 - DY/50 && y <= Y0 + NY*DY + DY/50)
			//if (y >= Y0 && y <= Y0 + NY*DY)
			if (x <= X0 + NX*DX + DX/50)
			context.lineTo(xtoSX(x)+0.05*numpixel, ytoSY(y)+0.05*numpixel);
		}
		//context.lineTo(xtoSX(x2)+0.5, ytoSY(y2)+0.5);
		context.stroke();
	}
}

function saveform(s) { return; }
