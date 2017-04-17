(function(){
	var $ = document.querySelector.bind(document);
	var cellSize = 36;
	var borderW = 122, borderH = 128, borderL = 61, borderT = 61;

	function Cell(row, col) {
		Object.defineProperty(this, 'row', {value: row});
		Object.defineProperty(this, 'col', {value: col});

		this.covered = true
		this.content = 0;
		this.flagged = false;
		this.pushed = false
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
	Cell.prototype.reset = function() {
		this.covered = true;
		this.content = 0;
		this.flagged = false;
		this.pushed = false;
		this.fadeTime = 0;
		this.shineTime = 0;
		this.bombTime = 0;
	}

	function Field(w, h, canvas) {
		var matrix = [];
		Object.defineProperty(this, 'matrix', {'get':function(){return matrix;}});
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

		this.onleft = null;
		this.onright = null;
		this.pauseTime = 0;
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
			if(px < borderL || x < 0 || x >= w || py < borderT || y < 0 || y >= h) {
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
		function getCell(e) {
			var cell;
			if(e.offsetY >= borderT && e.offsetX >= borderL) {
				var row = parseInt((e.offsetY - borderT) / 36), col = parseInt((e.offsetX - borderL) / 36);
				if(row < h && col < w) {
					cell = matrix[row][col];
				}
			}
			return cell;
		}
		canvas.addEventListener('mousedown', function(e) {
			var cell = getCell(e);
			if(!cell || self.pauseTime) return;
			if(e.button === 0) {
				isDown |= 1;
			} else if (e.button === 2) {
				isDown |= 2;
				if(isDown === 2) {
					if(typeof self.onright === 'function' && cell) {
						self.onright(cell);
					}
				}
			}

			if(isDown === 1) {
				pushDown(e.offsetX, e.offsetY, e.shiftKey && !cell.covered);
			} else if (isDown === 3) {
				pushDown(e.offsetX, e.offsetY, true);
			}
		});
		canvas.addEventListener('mousemove', function(e) {
			var cell = getCell(e);
			if(!cell || self.pauseTime) {
				self.hoverRow = self.hoverCol = -1;
				return;
			}
			self.hoverRow = cell.row; self.hoverCol = cell.col;

			if(isDown === 1) {
				clearDown();
				pushDown(e.offsetX, e.offsetY, e.shiftKey && !cell.covered);
			} else if (isDown === 3) {
				clearDown();
				pushDown(e.offsetX, e.offsetY, true);
			}
		});
		canvas.addEventListener('mouseup', function(e) {
			var cell = getCell(e);
			if(!cell || self.pauseTime) return;
			if(e.button === 0) {
				if(e.shiftKey && cell.covered) {
					if(typeof self.onright === 'function') {
						self.onright(cell);
					}
				} else {
					if(typeof self.onleft === 'function') { self.onleft(downCenter, downList.slice()); }
				}
				isDown &= ~1;
			} else if (e.button === 2) {
				if(isDown === 3) {
					if(typeof self.onleft === 'function') { self.onleft(downCenter, downList.slice()); }
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
		this.onready = listener;
	};
	Field.prototype.onLeft = function(listener) {
		this.onleft = listener;
	};
	Field.prototype.onRight = function(listener) {
		this.onright = listener;
	};
	Field.prototype.resetContent = function() {
		for(var row = 0; row < this.h; row++) {
			var rowx = this.matrix[row];
			for(var col = 0; col < this.w; col++) {
				rowx[col].reset();
			}
		}
	};
	Field.prototype.stopTime = function() {
		this.pauseTime = Date.now();
	}
	Field.prototype.resetTime = function(delta) {
		this.startTime = (delta || 0) + Date.now();
		this.pauseTime = undefined;
	};
	Field.prototype.setMineCnt = function(delta, init) {
		this.mines = delta + (init || this.mines);
	};
	Field.prototype.startScan = function() {
		this.scanTime = Date.now();
	};
	Field.prototype.initAnim = function() {
		for (var row = 0; row < this.h; row++) {
			for(var col = 0; col < this.w; col ++) {
				this.matrix[row][col].cover(600 * Math.random());
			}
		}
	};
	Field.prototype.dispose = function() {
		this.disposed = true;
	};

	function newField(canvasSelector, imgs, w, h) {
		var totalScanTime = h * 200;
		var canvas = $(canvasSelector);
		var bg = document.createElement('canvas');
		var g = canvas.getContext('2d');
		var width = w * cellSize + borderW, height = h * cellSize + borderH;
		var field = new Field(w, h, canvas);
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

			var str = 'Loading images: ' + ready + '/' + cnt;
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
				g.drawImage(imgs.repeat_u, 0, 0, 1, 60, 196, 0, width - 252 - 196, 60);
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
			if(typeof field.onready === 'function') field.onready();
			requestAnimationFrame(draw);
		}
		function draw() {
			// draw bg
			g.drawImage(bg, 0, 0);
			
			// draw status
			var tmEllipsed = 999;
			if(field.startTime > 0) {
				tmEllipsed = parseInt(((field.pauseTime || Date.now()) - field.startTime) / 1000);
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
						// shadow
						if(col <= 0 || (ele = field.matrix[row][col - 1]).covered && !ele.pushed) {
							g.subImage(imgs.full, 2003, 323, 4, 35, targetX + 1, targetY + 1);
						}
						if(row <= 0 || (ele = field.matrix[row - 1][col]).covered && !ele.pushed) {
							g.subImage(imgs.full, 963, 1123, 35, 4, targetX + 1, targetY + 1);
						}

						// content
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
							if(col <= 0 || (ele = field.matrix[row][col - 1]).covered && !ele.pushed) {
								g.subImage(imgs.full, 2003, 323, 4, 35, targetX + 1, targetY + 1);
							}
							if(row <= 0 || (ele = field.matrix[row - 1][col]).covered && !ele.pushed) {
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
						// hover
						if(e.row === field.hoverRow && e.col == field.hoverCol) {
							g.subImage(imgs.full, 881, 1121, 36, 36, targetX, targetY);
						}
						
						// fade of shining animation
						if(e.shineTime > 0 && currTm - e.shineTime > 0) {
							g.subImage(imgs.full, 1880, 1120, 36, 36, targetX, targetY);
							if(currTm - e.shineTime < 2000) {
								index = parseInt(38 * (currTm - e.shineTime) / 2000);
								x = index % 7; y = parseInt(index / 7);
								g.subImage(imgs.shine, x * 104, y * 304, 104, 309, targetX - 36, targetY - 138);
							}
						}
					}
					// flag
					if(e.flagged && e.shineTime <= 0) {
						g.subImage(imgs.full, 801, 1121, 36, 36, targetX, targetY);
					}
					// bomb animation
					if(currTm - e.bombTime < 2000) {
						index = Math.max(parseInt(21 * (currTm - e.bombTime) / 2000), 0);
						x = index % 3; y = parseInt(index / 3);
						g.subImage(imgs.bomb, x * 118, y * 118, 120, 120, targetX - 40, targetY - 40);
					}
				}
			}

			if(currTm - field.scanTime < totalScanTime && currTm - field.scanTime > 0) {
				var k =  1 - (currTm - field.scanTime) / totalScanTime;
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

			if(!field.disposed) requestAnimationFrame(draw);
		}

		// start logic here
		waitForImages();

		return field;
	};
	window.createField = function(w, h, id, imgs) {
		w = w || 30;
		h = h || 16;
		id = id || 'canvas';
		imgs = imgs || ({
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
		});
		return newField(id, imgs, w, h);
	}


	window.createBorder = function(element) {
		if(typeof element === 'string') {
			element = $(element);
		}
		var imf = $('#im_frame');
		if(!imf.complete) {
			setTimeout(createBorder.bind(this, element), 10);
			return;
		}
		function colorToHexStr(data, x, y, width) {
			function toHex(val) {
				var str = val.toString(16);
				if(str.length <= 1) {
					str = '0' + str;
				}
				return str;
			}
			var pos = (x + y * width) * 4;
			return '#' + toHex(data[pos]) + toHex(data[pos + 1]) + toHex(data[pos + 2]);
		}
		function linearGradientH(img, srcx, srcy, h, gdest, destx, desty, destw) {
			var canvas = document.createElement('canvas');
			canvas.width = 2; canvas.height = h;
			var g = canvas.getContext('2d');
			g.drawImage(img, srcx, srcy, 2, h, 0, 0, 2, h);
			var imgdata = g.getImageData(0, 0, 2, h).data;
			for(var i = 0; i < h; i++) {
				var gradient = g.createLinearGradient(0, 0, destw, 0);
				gradient.addColorStop(0, colorToHexStr(imgdata, 0, i, 2));
				gradient.addColorStop(1, colorToHexStr(imgdata, 1, i, 2));
				gdest.fillStyle = gradient;
				gdest.fillRect(destx, desty + i, destw, 1);
			}
		}
		function linearGradientV(img, srcx, srcy, w, gdest, destx, desty, desth) {
			var canvas = document.createElement('canvas');
			canvas.width = w; canvas.height = 2;
			var g = canvas.getContext('2d');
			g.drawImage(img, srcx, srcy, w, 2, 0, 0, w, 2);
			var imgdata = g.getImageData(0, 0, w, 2).data;
			for(var i = 0; i < w; i++) {
				var gradient = g.createLinearGradient(0, 0, 0, desth);
				gradient.addColorStop(0, colorToHexStr(imgdata, i, 0, w));
				gradient.addColorStop(1, colorToHexStr(imgdata, i, 1, w));
				gdest.fillStyle = gradient;
				gdest.fillRect(destx + i, desty, 1, desth);
			}
		}
		
		
		var w = element.offsetWidth, h = element.offsetHeight;
		var width = w + 21, height = h + 19;
		var canvas = document.createElement('canvas');
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height);
		canvas.style.cssText = 'pointer-events:none; position:absolute;left:-10px; top:-10px; width:' + 'width' + 'px; height:' + 'height' + 'px; z-index:3;';
		var g = canvas.getContext('2d');
		g.subImage = function(img, sx, sy, w, h, dx, dy){g.drawImage(img, sx, sy,w,h,dx,dy,w,h);}
		g.subImage(imf, 0, 0, 334, 51, 0, 0);
		g.subImage(imf, 0, 56, 75, 22, 0, height - 22);
		g.subImage(imf, 79, 56, 111, 22, width - 111, height - 22);
		g.subImage(imf, 192, 53, 255, 51, width - 255, 0);

		if(height - 51 - 22 > 0) {
			linearGradientV(imf, 0, 53, 10, g, 0, 51, height - 51 - 22);
		}
		if(width - 75 - 111 > 0) {
			linearGradientH(imf, 76,69, 9, g, 75, height - 9, width - 75 - 111);
		}
		if(width - 334 - 255 > 0) {
			linearGradientH(imf, 335, 0, 10, g, 334, 0, width - 334 - 255);
		}
		if(height - 51 - 22 > 0) {
			linearGradientV(imf, 179, 53, 11, g, width - 11, 51, height - 51 - 22);
		}

		element.appendChild(canvas);
	};

	window.createDialog = function(overcanvas, html){
		console.log('call');
		
		if(typeof overcanvas === 'string') {
			overcanvas = $(overcanvas);
		}
		var canvas = document.createElement('canvas');
		canvas.width = overcanvas.offsetWidth;
		canvas.height = overcanvas.offsetHeight;
		canvas.style.cssText = 'position:absolute; left:' + overcanvas.offsetLeft + 'px; top: ' + overcanvas.offsetTop + 'px; z-index: 9';
		canvas.style.clip = 'rect(100px 100px 100px 100px)'
		canvas.getContext('2d').drawImage(overcanvas, 0, 0);
		overcanvas.parentElement.appendChild(canvas);
		
	};
})();

