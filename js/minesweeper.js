const MS = {
  matrix: [],
  started: false,
  time: 0,
  mines: 0
};

const width = 30;
const height = 16;
const mineCount = 99;

function reset() {
  MS.matrix.splice(0, MS.matrix.length);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      let cell = { stepped: false, flaged: false, isMine: false, x: i, y: j };
      MS.matrix.push(cell);
    }
  }
  MS.mines = mineCount;
  MS.started = false;
}

function initMine(x, y) {
  let total = width * height;
  let mineMatrix = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      if (i !== x || j !== y) {
        let cell = { x: i, y: j }
        mineMatrix.push(cell);
      }
    }
  }

  for (let i = 0; i < mineCount; i++) {
    let mineIndex = randomInt(total - i);
    let mineCell = mineMatrix[mineIndex];
    MS.matrix[mineCell.y * width + mineCell.x].isMine = true;
  }
}

function randomInt(excluesiveMax) {
  return Math.floor(Math.random() * excluesiveMax);
}

/* 
  x, y start from 0
*/
function step(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }
  let index = getOneDimensionIndex(x, y);
  let cell = MS.matrix[index];
  if (cell && !cell.stepped) {
    cell.stepped = true;
    if (cell.isMine === true) {
      //do with lost logic
      return;
    }
    if (getMineAroundCount(x, y) === 0) {
      step(x - 1, y - 1);
      step(x - 1, y    );
      step(x - 1, y + 1);
      step(x    , y - 1);
      step(x    , y + 1);
      step(x + 1, y - 1);
      step(x + 1, y    );
      step(x + 1, y + 1);
    }
    //judge win & do with win logic
  }
}

function getOneDimensionIndex(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return null;
  }
  return y * width + x;
}

function getMineAroundCount(x, y) {
  let indexes = [
    getOneDimensionIndex(x - 1, y - 1),
    getOneDimensionIndex(x - 1, y    ),
    getOneDimensionIndex(x - 1, y + 1),
    getOneDimensionIndex(x    , y - 1),
    getOneDimensionIndex(x    , y + 1),
    getOneDimensionIndex(x + 1, y - 1),
    getOneDimensionIndex(x + 1, y    ),
    getOneDimensionIndex(x + 1, y + 1)
  ].filter(e => e !== null);
  let result = indexes.map(i => MS.matrix[i])
      .filter(e => e !== null)
      .filter(e => e !== undefined)
      .filter(e => e.isMine === true);
  return result.length;
}

let app = new Vue({
  el: '#app',
  data: {
    minesweeper: MS
  }, 
  methods: {
    start: function() {
      this.minesweeper.started = true;
      this.minesweeper.startTime = Date.now();
      this.minesweeper.timerId = setInterval(()=>{
        var tm = parseInt((Date.now() - this.minesweeper.startTime) / 1000);
        if(tm > 999) {
          tm = 999;
        }
        this.minesweeper.time = tm;
      }, 100);
    },
    mineAroundCount: function(x, y) {
      return getMineAroundCount(x, y);
    }, 
    click: function(x, y) {
      if (this.minesweeper.started === false) {
        this.start();
        initMine(x, y);
      }
      step(x, y);
    }, calcCellStyle: function (item) {
      var x = item.x;
      var y = item.y;
      var index = x + y * 30;

      var pos_x = parseInt(index % 25);
      var pos_y = parseInt(index / 25);
      pos_x = pos_x * 40 + 3;
      pos_y = pos_y * 40 + 3;

      var ret = `background-position: -${pos_x}px -${pos_y}px;`;
      return ret;
    }, calcCellBottomStyle: function(item) {
      var x = item.x;
      var y = item.y;
      var index = x + y * 30;

      var pos_x = parseInt(index % 25);
      var pos_y = parseInt(index / 25);
      pos_x = pos_x * 40 + 3 + 1000;
      pos_y = pos_y * 40 + 3;

      var ret = `background-position: -${pos_x}px -${pos_y}px;`;
      return ret;
    }, calcGridStyle: function() {
      return `width: ${width * 36}px; height: ${height * 36}px;`
    }, calcAttachmentClass: function(item) {
      var ret = {};
      ret['cell-content'] = item.stepped;
      if(item.isMine) {
        if (item.stepped) {
          ret['cell-mine-stepped'] = true;
        } else {
          ret['cell-mine'] = true;
        }
      } else {
        ret['cell-' + getMineAroundCount(item.x, item.y)] = true;
      }
      return ret;
    }
  }
});

(function (){
  reset()
})();