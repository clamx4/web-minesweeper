(function(){
	var $ = document.querySelector.bind(document);
	var cellSize = 36;
	var borderW = 122, borderH = 128, borderL = 61, borderT = 61;

	function Cell(row, col) {
		Object.defineProperty(this, 'row', {value: row});
		Object.defineProperty(this, 'col', {value: col});

		this.covered = Math.random() > 0.5;
		this.content = Math.random() > 0.5? parseInt(Math.random() * 8): (Math.random() < 0.1? 'mine-red': 'mine');
		this.flagged =  Math.random() > 0.5;
		this.pushed =  false;
		this.fadeTime = 0;
		this.shineTime = 0;
		this.bombTime = 0;
	}
	Cell.prototype.cover = function(delta) {
		this.fadeTime = (delta || 0) + Date.now();
		this.covered = true;
	};
	Cell.prototype.uncover = function(delta) {
		this.fadeTime = (delta || 0) + Date.now();
		this.covered = false;
	};
	Cell.prototype.shine = function(delta) {
		this.shineTime = (delta || 0) + Date.now();
	}
	Cell.prototype.flag = function() {
		this.flagged = true;
	}
	Cell.prototype.unflag = function() {
		this.flagged = false;
	}
	Cell.prototype.number = function(num) {
		this.content = parseInt(num);
	}
	Cell.prototype.mine = function(stepped) {
		this.content = stepped? 'mine-red': 'mine';
	}
	Cell.prototype.bomb = function(delta) {
		this.bombTime = (delta || 0) + Date.now();
	}

	function Field(w, h, canvas) {
		var matrix = [];
		Object.defineProperty(this, 'matrix', {'get':()=>matrix});
		for(var row = 0; row < h; row++) {
			var rowx = (matrix[row] = []);
			for(var col = 0; col < w; col++) {
				rowx[col] = new Cell(row, col);
			}
		}
		// read only properties
		Object.defineProperty(this, 'w', {value: w});
		Object.defineProperty(this, 'h', {value: h});
		
		this.mines = 0;
		this.startTime = -1;
		this.scanTime = 0;

		this.onLeft = null;
		this.onRight = null;
		var self = this;

		var isDown = 0;
		var downList = [];
		var downCenter = null;
		function clearDown() {
			while(downList.length > 0) {
				var e = downList.pop();
				matrix[e[0]][e[1]].pushed = false;
			}
			downCenter = null;
		}
		function pushDown(px, py, adj) {
			var x = parseInt((px - borderL) / 36), y = parseInt((py - borderT) / 36);
			if(x < 0 || x >= w || y < 0 || y >= h) {
				return;
			}
			downCenter = matrix[y][x];
			if(adj) {
				for(var i = 0; i < 9; i++) {
					var x_ = x + parseInt(i / 3) - 1, y_ = y + parseInt(i % 3) - 1;
					if(x_ < 0 || x_ >= w || y_ < 0 || y_ >= h) {
						continue;
					}
					if(!matrix[y_][x_].flagged) {
						matrix[y_][x_].pushed = true;
						downList.push([y_, x_]);
					}
				}
			} else {
				if(!matrix[y][x].flagged) {
					matrix[y][x].pushed = true;
					downList.push([y, x]);
				}
			}
		}
		canvas.addEventListener('mousedown', function(e) {
			if(e.button == 0) {
				isDown |= 1;
			} else if (e.button == 2) {
				isDown |= 2;
			}
			if(isDown == 1) {
				pushDown(e.offsetX, e.offsetY);
			} else if (isDown == 3) {
				pushDown(e.offsetX, e.offsetY, true);
			}
		});
		canvas.addEventListener('mousemove', function(e) {
			if(isDown == 1) {
				clearDown();
				pushDown(e.offsetX, e.offsetY);
			} else if (isDown == 3) {
				clearDown();
				pushDown(e.offsetX, e.offsetY, true);
			}
		});
		canvas.addEventListener('mouseup', function(e) {
			if(e.button == 0) {
				if(typeof self.onLeft == 'function') { self.onLeft(downCenter, downList.slice()); }
				isDown &= ~1;
			} else if (e.button == 2) {
				if(isDown != 3) {
					if(typeof self.onRight == 'function') { self.onRight(matrix[parseInt((e.offsetY - borderT) / 36)][parseInt((e.offsetX - borderL) / 36)]); }
				}
				isDown &= ~2;
			}
			clearDown();
		});

		// no context menu 
		canvas.addEventListener('contextmenu', function(e) {
			e.preventDefault();
			e.stopPropagation();
		});
	}
	Field.prototype.onReady = function(listener) {
		this.readyListener = listener;
	};
	Field.prototype.ready = function() {
		if(this.readyListener) {
			this.readyListener();
		}
	}
	Field.prototype.resetContent = function() {
		for(var row = 0; row < h; row++) {
			var rowx = this.matrix[row];
			for(var col = 0; col < w; col++) {
				rowx[col] = {'row': row, 'col': col};
			}
		}
	}

	Field.prototype.resetTime = function(delta) {
		this.startTime = (delta || 0) + Date.now();
	}
	Field.prototype.setMineCnt = function(delta, init) {
		this.mines = delta + (init || this.mines);
	}
	Field.prototype.startScan = function() {
		this.startScan = Date.now();
	}
	Field.prototype.init = function() {
		for (var row = 0; row < this.h; row++) {
			for(var col = 0; col < this.w; col ++) {
				this.matrix[row][col].cover(600 * Math.random());
			}
		}
	}

	document.addEventListener('DOMContentLoaded', (function(canvasSelector, imgs, w, h) {
		var canvas = $(canvasSelector);
		var bg = document.createElement('canvas');
		var g = canvas.getContext('2d');
		var width = w * cellSize + borderW, height = h * cellSize + borderH;
		var field = (window.field = new Field(w, h, canvas));
		var drawStatus;
		
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height);
		bg.setAttribute('width', width);
		bg.setAttribute('height', height);

		g.fillStyle = '#000';
		g.fillRect(0, 0, width, height);
		g.font = "bold 30px Consolas";
		g.textBaseline = 'top';
		g.subImage = function(img, sx, sy, w, h, dx, dy){g.drawImage(img, sx, sy,w,h,dx,dy,w,h);}

		function waitForImages() {
			var cnt = 0, ready = 0;
			for(var e in imgs) {
				var im = imgs[e];
				cnt++;
				if(im.complete) {
					ready ++;
				}
			}

			var str = `Loading images: ${ready}/${cnt}`;
			var len = g.measureText(str).width;

			g.fillStyle = '#000';
			g.fillRect(0, 0, width, height);
			g.fillStyle = "#fff";
			g.fillText(str, (width - len) / 2, (height - 30) / 2);

			if(ready < cnt) {
				setTimeout(waitForImages, 100);
			} else {
				requestAnimationFrame(prepareBackground);
			}
		}

		function prepareBackground() {
			// clear screen
			g.fillStyle = '#000';
			g.fillRect(0, 0, width, height);

			// draw border - u, l, b, r
			g.subImage(imgs.border, 229, 15, 252, 62, width - 252, 0);
			g.subImage(imgs.border, 22, 15, 196, 62, 0, 0);
			if(width - 252 - 196 > 0) {
				g.drawImage(imgs.repeat_u, 0, 0, 1, 62, 196, 0, width - 252 - 196, 62);
			}
			g.subImage(imgs.border, 22, 78, 60, 50, 0, 62);
			g.subImage(imgs.border, 22, 135, 60, 346, 0, height - 346);
			if(height - 346 - 62 > 0) {
				g.drawImage(imgs.repeat_l, 0, 0, 60, 1, 0, 112, 60, height - 346 - 62);
			}
			g.subImage(imgs.border, 82, 415, 162, 66, 60, height - 66);
			g.subImage(imgs.border, 251, 415, 170, 66, width - 170 - 60, height - 66);
			if(width - 162 - 170 - 60 > 0) {
				g.drawImage(imgs.repeat_b, 0, 0, 1, 66, 60 + 162, height - 66, width - 162 - 170 - 120, 66);
			}
			g.subImage(imgs.border, 421, 241, 60, 240, width - 60, height - 240);
			g.subImage(imgs.border, 421, 80, 60, 146, width - 60, 62);
			if(height - 240 - 146 - 62 > 0) {
				g.drawImage(imgs.repeat_r, 0, 0, 60, 1, width - 60, 146 + 62, 60, height - 240 - 146 - 62);
			}

			// clock and mine
			var textAreaFieldLength = 82;
			g.drawImage(imgs.ic_board, width * 0.2, height - 8 - 44);
			g.drawImage(imgs.ic_clock, width * 0.2 - 56, height - 8 - 44 - 4);
			g.drawImage(imgs.ic_board, width * 0.8 - 82, height - 8 - 44);
			g.drawImage(imgs.ic_mine, width * 0.8, height - 8 - 44 - 4);

			for (var row = 0; row < field.h; row++) {
				for(var col = 0; col < field.w; col++) {
					var x = col;
					var y = row;
					var index = x + y * 30;
					var pos_x = parseInt(index % 25);
					var pos_y = parseInt(index / 25);
					pos_x = pos_x * 40 + 1002;
					pos_y = pos_y * 40 + 2;
					var targetX = borderL + x * 36, targetY = borderT + y * 36;
					g.subImage(imgs.full, pos_x, pos_y, 36, 36, targetX, targetY);
				}
			}

			drawStatus = function(time, mineCnt) {
				time = String(time);
				mineCnt = String(mineCnt);
				var len1 = g.measureText(time).width;
				var len2 = g.measureText(mineCnt).width;

				g.fillStyle = "#fff";
				g.font = "normal 24px Consolas";
				g.fillText(time, width * 0.2 + (textAreaFieldLength - len1) / 2, height - 44);
				g.fillText(mineCnt, width * 0.8 - textAreaFieldLength + (textAreaFieldLength - len2) / 2, height - 44);
			};

			// cache it
			bg.getContext('2d').drawImage(canvas, 0, 0);
			field.ready();
			requestAnimationFrame(draw);
		}
		function draw() {
			// draw bg
			g.drawImage(bg, 0, 0);
			
			// draw status
			var tmEllipsed = 999;
			if(field.startTime > 0) {
				tmEllipsed = parseInt((Date.now() - field.startTime) / 1000);
			}
			drawStatus(tmEllipsed, field.mines);

			var currTm = Date.now();
			var ele;
			for (var row = 0; row < field.h; row++) {
				var rows = field.matrix[row];
				for(var col = 0; col < field.w; col++) {
					var e = rows[col];

					var x = e.col;
					var y = e.row;
					var index = x + y * 30;
					var pos_x = parseInt(index % 25);
					var pos_y = parseInt(index / 25);
					pos_x = pos_x * 40 + 2/* + 1001*/;
					pos_y = pos_y * 40 + 2;
					var targetX = borderL + x * 36, targetY = borderT + y * 36;
					if(!e.covered) {
						if(col > 0 && (ele = field.matrix[row][col - 1]).covered && !ele.pushed) {
							g.subImage(imgs.full, 2003, 323, 4, 35, targetX + 1, targetY + 1);
						}
						if(row > 0 && (ele = field.matrix[row - 1][col]).covered && !ele.pushed) {
							g.subImage(imgs.full, 963, 1123, 35, 4, targetX + 1, targetY + 1);
						}
						if(e.content > 0 && e.content <= 8) {
							g.subImage(imgs.full, 1999, 1 + 40 * (e.content - 1), 36, 36, targetX - 2, targetY - 1);
						} else if (e.content == 'mine') {
							g.subImage(imgs.full, 1800, 1120, 36, 36, targetX, targetY);
						} else if (e.content == 'mine-red') {
							g.subImage(imgs.full, 1840, 1120, 36, 36, targetX, targetY);
						}
						// fade out of cover
						if(currTm - e.fadeTime < 200) {
							g.globalAlpha = 1 - (currTm - e.fadeTime) / 200;
							g.subImage(imgs.full, pos_x, pos_y, 36, 36, targetX, targetY);
							g.globalAlpha = 1;
						}
						
					} else {
						// if pushed, do nothing
						if(e.pushed) {
							if(col > 0 && (ele = field.matrix[row][col - 1]).covered && !ele.pushed) {
								g.subImage(imgs.full, 2003, 323, 4, 35, targetX + 1, targetY + 1);
							}
							if(row > 0 && (ele = field.matrix[row - 1][col]).covered && !ele.pushed) {
								g.subImage(imgs.full, 963, 1123, 35, 4, targetX + 1, targetY + 1);
							}
							continue;
						}
						// fade in of cover
						if(currTm - e.fadeTime < 200) {
							g.globalAlpha = Math.max((currTm - e.fadeTime) / 200, 0);
							g.subImage(imgs.full, pos_x, pos_y, 36, 36, targetX, targetY);
							g.globalAlpha = 1;
						} else {
							g.subImage(imgs.full, pos_x, pos_y, 36, 36, targetX, targetY);
						}
						if(e.flagged) {
							g.subImage(imgs.full, 801, 1121, 36, 36, targetX, targetY);
						}
						// fade of shining animation
						if(currTm - e.shineTime < 2000) {
							index = parseInt(38 * (currTm - e.shineTime) / 2000);
							x = index % 7; y = parseInt(index / 7);
							g.subImage(imgs.shine, x * 104, y * 304, 104, 309, targetX - 36, targetY - 138);
						}
					}
					if(currTm - e.bombTime < 2000) {
						index = parseInt(21 * (currTm - e.bombTime) / 2000);
						x = index % 3; y = parseInt(index / 3);
						g.subImage(imgs.bomb, x * 118, y * 118, 120, 120, targetX - 40, targetY - 40);
					}
				}
			}

			if(currTm - field.startScan < 5000 && currTm - field.startScan > 0) {
				var k =  1 - (currTm - field.startScan) / 5000;
				g.save();
				g.beginPath();
				g.lineTo(borderL, borderT);
				g.lineTo(borderL, height - (borderH - borderT));
				g.lineTo(width - borderW + borderL, height - (borderH - borderT));
				g.lineTo(width - borderW + borderL, borderT);
				g.lineTo(borderL, borderT);
				g.closePath();
				g.clip();

				g.drawImage(imgs.shine, 0, 1855, 552, 90, borderL + 1, height * k - borderT, width - borderW, 90);
				g.restore();
			}

			requestAnimationFrame(draw);
		}

		// start logic here
		waitForImages();
	}).bind(window, '#canvas', {
		border:$('#im_border'),
		full:$('#im_full'),
		ic_clock:$('#im_ic_clock'),
		ic_mine:$('#im_ic_mine'),
		ic_board:$('#im_ic_board'),
		repeat_b:$('#im_repeat_b'),
		repeat_l:$('#im_repeat_l'),
		repeat_r:$('#im_repeat_r'),
		repeat_u:$('#im_repeat_u'),
		shine:$('#im_shine'),
		bomb:$('#im_bomb')
	}, 30, 16));
})();

/* how to use */

document.addEventListener('DOMContentLoaded', function(){
	field.onReady(function() {
		field.init();
		field.resetTime();
		field.setMineCnt(0, 0);
	})
})
setTimeout(()=>{
	field.onLeft = function(center, arr) {
		for(var i = 0; i < arr.length; i++) {
			var e = field.matrix[arr[i][0]][arr[i][1]];
			if(e.covered) {
				e.uncover(-200);
			}
		}
	}
	field.onRight = function(center, arr) {
		if(center.flagged) {
			center.unflag();
		} else {
			center.flag();
		}
	}
}, 2000);

setTimeout(()=>{
	field.matrix[0][0].shine();
	for(var i = 0; i < 30; i++) {
		field.matrix[3][i].bomb(i * 100);
	}
}, 3000);

setTimeout(()=>{
	field.startScan();
}, 4000);