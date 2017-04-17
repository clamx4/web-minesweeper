(function(cfg) {
	function toRange(x, max, min) {
		return Math.max(Math.min(max, x), min);
	}
	function getQueryString(name) {
		var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
		var r = window.location.search.substr(1).match(reg);
		if (r != null) return unescape(r[2]); return null;
    }
    var w = toRange(parseInt(getQueryString('w') || 30), 30, 8);
    var h = toRange(parseInt(getQueryString('h') || 16), 24, 8);
    var mines = toRange(parseInt(getQueryString('mines') || 99), parseInt(w * h / 2), 10);
    console.log(w, h, mines);

	var field = createField(w, h, '#field-canvas');
	createBorder('div.main');
	var game = new MSGame(w, h, mines, field);
	
	cfg.exit.addEventListener('click', function() {
		if(confirm('Tired of Mine Swepper?')) {
			return location.href = 'about:blank';
		}
	});
	cfg.settings.addEventListener('click', function() {
		var w = 30, h = 16, mineCnt = 99;
		location.href = location.origin + location.pathname + '?w='+w+'&h='+h+'&mines='+mineCnt;
	});
	cfg.restart.addEventListener('click', function() {
		game.restart();
	});

	function MSGame(w, h, totalMines, field) {
		var stopped = false;
		var uncoveredCnt = 0;
		field.onReady(function() {
			reset();
			createDialog('#field-canvas', '');
		});
		field.onRight(function(center) {
			if(stopped) return;
			if(!center.covered) {
				return;
			}
			if(center.flagged) {
				center.unflag();
				field.setMineCnt(1);
			} else {
				center.flag();
				field.setMineCnt(-1);
			}
		});
		field.onLeft(function(cell, points) {
			if(stopped || cell.flagged) return;
			if(points.length > 1) {
				if(cell.covered) return;
				if(getAdj(cell).filter(function(e){return e.flagged;}).length === cell.content){
					expand(points.map(function(pos){
						return field.matrix[pos[0]][pos[1]];
					}));
				}
			} else if(cell.covered) {
				expand(cell);
			}
		});

		function expand(cell) {
			if(field.startTime < 0) {
				initialize(cell);
			}

			var toUncover;
			if(cell instanceof Array) {
				toUncover = cell.map(function(e){return [e, -200]});
			} else {
				toUncover = [[cell, -200]];
			}
			// dfs search
			while(toUncover.length > 0) {
				var e = toUncover.shift();
				var cx = e[0], tx = e[1];
				if(!cx.covered) continue;
				cx.uncover(tx);
				uncoveredCnt ++;

				if(cx.content === 0) {
					getAdj(cx).forEach(function(adj) {
						if(!adj.covered || adj.flagged) return;
						toUncover.push([adj, tx + 40]);
					});
				} else if (cx.content === 'mine') {
					cx.mine(true);
					bombAll(cx);
					return;
				}
			}
			if(uncoveredCnt >= w * h - totalMines) {
				win();
			}
		}
		function bombAll(ex) {
			field.stopTime();
			stopped = true;
			ex.bomb();
			var maxDist = 0;
			for (var row = 0; row < h; row++) {
				for (var col = 0; col < w; col++) {
					var e = field.matrix[row][col];
					if(e.content === 'mine') {
						e.uncover();
						var d = 800 + dist(e, ex) * 200;
						maxDist = Math.max(d, maxDist);
						e.bomb(d);
					}
				}
			}
			setTimeout(function() {
				if(stopped) {
					alert('You lose!');
				}
			}, maxDist + 2100);
			function dist(e1, e2) {
				var dr = e1.row - e2.row, dc = e1.col - e2.col;
				return Math.sqrt(dr * dr + dc * dc);
			}
		}
		function win() {
			field.stopTime();
			field.startScan();
			stopped = true;
			for (var row = 0; row < h; row++) {
				for (var col = 0; col < w; col++) {
					var e = field.matrix[row][col];
					if(e.content === 'mine') {
						e.shine((h - row) * 170);
					}
				}
			}
			setTimeout(function() {
				if(stopped) {
					alert('You win!');
				}
			}, 2000 + h * 200);
		}
		function getAdj(cell) {
			var row = cell.row, col = cell.col;
			var adjs = [];
			if(row > 0) {
				if(col > 0) {
					adjs.push(field.matrix[row - 1][col - 1]);
				}
				if(col < w - 1) {
					adjs.push(field.matrix[row - 1][col + 1]);
				}
				adjs.push(field.matrix[row - 1][col]);
			}
			if(col > 0) {
				adjs.push(field.matrix[row][col - 1]);
			}
			if(col < w - 1) {
				adjs.push(field.matrix[row][col + 1]);
			}
			if(row < h - 1) {
				if(col > 0) {
					adjs.push(field.matrix[row + 1][col - 1]);
				}
				if(col < w - 1) {
					adjs.push(field.matrix[row + 1][col + 1]);
				}
				adjs.push(field.matrix[row + 1][col]);
			}
			return adjs;
		}
		function initialize(cell) {
			field.resetTime(0);
			var startRow = cell.row, startCol = cell.col;

			// generate mines
			var cells = [];
			for (var row = 0; row < h; row++) {
				for (var col = 0; col < w; col++) {
					if(Math.abs(row - startRow) <= 1 && Math.abs(col - startCol) <= 1) continue;
					cells.push(field.matrix[row][col]); 
				}
			}
			// suffle
			for(var i = 0; i < cells.length; i++) {
				var j = parseInt(Math.random() * cells.length);
				if(j != i) {
					var tmp;
					tmp = cells[i];
					cells[i] = cells[j];
					cells[j] = tmp;
				}
			}
			// set mine
			for(i = 0; i < totalMines; i++) {
				cells.pop().mine();
			}

			// statistic mines around
			for (row = 0; row < h; row++) {
				for (col = 0; col < w; col++) {
					var cnt = 0;
					var c = field.matrix[row][col];
					if(c.content === 'mine') continue;
					c.number(getAdj(c).filter(function(e){ return e.content === 'mine'; }).length);
				}
			}
		}
		function reset() {
			field.resetContent();
			field.resetTime(-Infinity);
			field.initAnim();
			field.setMineCnt(0, totalMines);
			stopped = false;
			uncoveredCnt = 0;
		}
		Object.defineProperty(this, 'reset', {value : reset});
	}
	MSGame.prototype.restart = function() {
		this.reset();
	};
})(window.mscfg);