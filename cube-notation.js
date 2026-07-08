(function () {
  const colors = {
    U: '#EF0',
    D: '#FFF',
    L: '#08F',
    R: '#0C0',
    F: '#F10',
    B: '#F90',
    masked: '#222'
  };

  const faceDefinitions = {
    U: { normal: [0, 1, 0], position: (a, b) => [a, 1, b] },
    D: { normal: [0, -1, 0], position: (a, b) => [a, -1, b] },
    L: { normal: [-1, 0, 0], position: (a, b) => [-1, a, b] },
    R: { normal: [1, 0, 0], position: (a, b) => [1, a, b] },
    F: { normal: [0, 0, 1], position: (a, b) => [a, b, 1] },
    B: { normal: [0, 0, -1], position: (a, b) => [a, b, -1] }
  };

  function solvedCube() {
    const stickers = [];
    Object.entries(faceDefinitions).forEach(([color, face]) => {
      [-1, 0, 1].forEach((a) => {
        [-1, 0, 1].forEach((b) => {
          stickers.push({ color, normal: [...face.normal], position: face.position(a, b) });
        });
      });
    });
    return stickers;
  }

  function rotatePositive([x, y, z], axis) {
    if (axis === 'x') return [x, -z, y];
    if (axis === 'y') return [z, y, -x];
    return [-y, x, z];
  }

  function rotateVector(vector, axis, quarterTurns) {
    let turns = ((quarterTurns % 4) + 4) % 4;
    let result = [...vector];
    while (turns > 0) {
      result = rotatePositive(result, axis);
      turns -= 1;
    }
    return result;
  }

  const moveDefinitions = {
    U: { axis: 'y', layers: [1], turn: -1 },
    D: { axis: 'y', layers: [-1], turn: 1 },
    L: { axis: 'x', layers: [-1], turn: 1 },
    R: { axis: 'x', layers: [1], turn: -1 },
    F: { axis: 'z', layers: [1], turn: -1 },
    B: { axis: 'z', layers: [-1], turn: 1 },
    M: { axis: 'x', layers: [0], turn: 1 },
    E: { axis: 'y', layers: [0], turn: 1 },
    S: { axis: 'z', layers: [0], turn: -1 },
    u: { axis: 'y', layers: [1, 0], turn: -1 },
    d: { axis: 'y', layers: [-1, 0], turn: 1 },
    l: { axis: 'x', layers: [-1, 0], turn: 1 },
    r: { axis: 'x', layers: [1, 0], turn: -1 },
    f: { axis: 'z', layers: [1, 0], turn: -1 },
    b: { axis: 'z', layers: [-1, 0], turn: 1 },
    x: { axis: 'x', layers: [-1, 0, 1], turn: -1 },
    y: { axis: 'y', layers: [-1, 0, 1], turn: -1 },
    z: { axis: 'z', layers: [-1, 0, 1], turn: -1 }
  };

  function normalizeMoveName(name) {
    const wide = { Uw: 'u', Dw: 'd', Lw: 'l', Rw: 'r', Fw: 'f', Bw: 'b' };
    return wide[name] || name;
  }

  function parseAlgorithm(algorithm) {
    const cleaned = algorithm
      .replaceAll('’', "'")
      .replace(/[()[\],]/g, ' ')
      .trim();
    if (!cleaned) return [];
    return cleaned.split(/\s+/).map((token) => {
      const match = token.match(/^(Uw|Dw|Lw|Rw|Fw|Bw|[UDLRFBMESxyzudlrfb])(2'?|')?$/);
      if (!match) throw new Error(`Unknown cube move "${token}".`);
      const suffix = match[2] || '';
      return {
        name: normalizeMoveName(match[1]),
        turns: suffix.startsWith('2') ? 2 : suffix === "'" ? -1 : 1
      };
    });
  }

  function applyMove(cube, move) {
    const definition = moveDefinitions[move.name];
    if (!definition) throw new Error(`Unsupported cube move "${move.name}".`);
    const coordinate = { x: 0, y: 1, z: 2 }[definition.axis];
    const quarterTurns = definition.turn * move.turns;
    cube.forEach((sticker) => {
      if (!definition.layers.includes(sticker.position[coordinate])) return;
      sticker.position = rotateVector(sticker.position, definition.axis, quarterTurns);
      sticker.normal = rotateVector(sticker.normal, definition.axis, quarterTurns);
    });
  }

  function stateBeforeAlgorithm(algorithm, rotation = '', auf = '') {
    const cube = solvedCube();
    parseAlgorithm(rotation).forEach((move) => applyMove(cube, move));
    const moves = parseAlgorithm(`${auf} ${algorithm}`.trim()).reverse();
    moves.forEach((move) => applyMove(cube, { ...move, turns: -move.turns }));
    return cube;
  }

  function sameVector(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function stickerAt(cube, face, a, b) {
    const definition = faceDefinitions[face];
    const position = definition.position(a, b);
    return cube.find((sticker) => sameVector(sticker.normal, definition.normal)
      && sameVector(sticker.position, position))?.color || 'masked';
  }

  function renderCmll(algorithm, options = {}) {
    const cube = stateBeforeAlgorithm(algorithm, options.rotation, options.auf);
    const showEdges = options.edges === 'show';
    const showCenter = options.center === 'show';
    const edgeIds = new Set(['Ub', 'Ul', 'Ur', 'Uf', 'uB', 'uL', 'uR', 'uF']);
    const facelets = {
      Ubl: stickerAt(cube, 'U', -1, -1), Ub: stickerAt(cube, 'U', 0, -1), Urb: stickerAt(cube, 'U', 1, -1),
      Ul: stickerAt(cube, 'U', -1, 0), U: stickerAt(cube, 'U', 0, 0), Ur: stickerAt(cube, 'U', 1, 0),
      Ulf: stickerAt(cube, 'U', -1, 1), Uf: stickerAt(cube, 'U', 0, 1), Ufr: stickerAt(cube, 'U', 1, 1),
      uBl: stickerAt(cube, 'B', -1, 1), uB: stickerAt(cube, 'B', 0, 1), urB: stickerAt(cube, 'B', 1, 1),
      ubL: stickerAt(cube, 'L', 1, -1), uL: stickerAt(cube, 'L', 1, 0), uLf: stickerAt(cube, 'L', 1, 1),
      uRb: stickerAt(cube, 'R', 1, -1), uR: stickerAt(cube, 'R', 1, 0), ufR: stickerAt(cube, 'R', 1, 1),
      ulF: stickerAt(cube, 'F', -1, 1), uF: stickerAt(cube, 'F', 0, 1), uFr: stickerAt(cube, 'F', 1, 1)
    };
    const col = (id) => colors[(id === 'U' && !showCenter) || (edgeIds.has(id) && !showEdges) ? 'masked' : facelets[id]];
    const polygon = (id, points) => `<polygon class="cube-facelet" id="${id}" fill="${col(id)}" stroke="#000000" points="${points}"/>`;

    return `<svg class="cube-diagram" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-0.9 -0.9 1.8 1.8" role="img" aria-label="CMLL cube state">
      <rect fill="transparent" x="-0.9" y="-0.9" width="1.8" height="1.8"/>
      <g style="stroke-width:0.1;stroke-linejoin:round;opacity:1">
        <polygon fill="#000000" stroke="#000000" points="-0.522222222222,-0.522222222222 0.522222222222,-0.522222222222 0.522222222222,0.522222222222 -0.522222222222,0.522222222222"/>
      </g>
      <g style="opacity:1;stroke-opacity:0.5;stroke-width:0;stroke-linejoin:round">
        ${polygon('Ubl', '-0.527777777778,-0.527777777778 -0.212962962963,-0.527777777778 -0.212962962963,-0.212962962963 -0.527777777778,-0.212962962963')}
        ${polygon('Ub', '-0.157407407407,-0.527777777778 0.157407407407,-0.527777777778 0.157407407407,-0.212962962963 -0.157407407407,-0.212962962963')}
        ${polygon('Urb', '0.212962962963,-0.527777777778 0.527777777778,-0.527777777778 0.527777777778,-0.212962962963 0.212962962963,-0.212962962963')}
        ${polygon('Ul', '-0.527777777778,-0.157407407407 -0.212962962963,-0.157407407407 -0.212962962963,0.157407407407 -0.527777777778,0.157407407407')}
        ${polygon('U', '-0.157407407407,-0.157407407407 0.157407407407,-0.157407407407 0.157407407407,0.157407407407 -0.157407407407,0.157407407407')}
        ${polygon('Ur', '0.212962962963,-0.157407407407 0.527777777778,-0.157407407407 0.527777777778,0.157407407407 0.212962962963,0.157407407407')}
        ${polygon('Ulf', '-0.527777777778,0.212962962963 -0.212962962963,0.212962962963 -0.212962962963,0.527777777778 -0.527777777778,0.527777777778')}
        ${polygon('Uf', '-0.157407407407,0.212962962963 0.157407407407,0.212962962963 0.157407407407,0.527777777778 -0.157407407407,0.527777777778')}
        ${polygon('Ufr', '0.212962962963,0.212962962963 0.527777777778,0.212962962963 0.527777777778,0.527777777778 0.212962962963,0.527777777778')}
      </g>
      <g style="opacity:1;stroke-opacity:1;stroke-width:0.02;stroke-linejoin:round">
        ${polygon('uBl', '-0.195146871009,-0.554406130268 -0.543295019157,-0.554406130268 -0.507279693487,-0.718390804598 -0.183141762452,-0.718390804598')}
        ${polygon('uB', '0.174457215837,-0.554406130268 -0.173690932312,-0.554406130268 -0.161685823755,-0.718390804598 0.16245210728,-0.718390804598')}
        ${polygon('urB', '0.544061302682,-0.554406130268 0.195913154534,-0.554406130268 0.183908045977,-0.718390804598 0.508045977011,-0.718390804598')}
        ${polygon('ubL', '-0.554406130268,-0.544061302682 -0.554406130268,-0.195913154534 -0.718390804598,-0.183908045977 -0.718390804598,-0.508045977011')}
        ${polygon('uL', '-0.554406130268,-0.174457215837 -0.554406130268,0.173690932312 -0.718390804598,0.161685823755 -0.718390804598,-0.16245210728')}
        ${polygon('uLf', '-0.554406130268,0.195146871009 -0.554406130268,0.543295019157 -0.718390804598,0.507279693487 -0.718390804598,0.183141762452')}
        ${polygon('uRb', '0.554406130268,-0.195913154534 0.554406130268,-0.543295019157 0.718390804598,-0.507279693487 0.718390804598,-0.183141762452')}
        ${polygon('uR', '0.554406130268,0.174457215837 0.554406130268,-0.173690932312 0.718390804598,-0.161685823755 0.718390804598,0.16245210728')}
        ${polygon('ufR', '0.554406130268,0.544061302682 0.554406130268,0.195913154534 0.718390804598,0.183908045977 0.718390804598,0.508045977011')}
        ${polygon('ulF', '-0.544061302682,0.554406130268 -0.195913154534,0.554406130268 -0.183141762452,0.718390804598 -0.508045977011,0.718390804598')}
        ${polygon('uF', '-0.174457215837,0.554406130268 0.173690932312,0.554406130268 0.161685823755,0.718390804598 -0.16245210728,0.718390804598')}
        ${polygon('uFr', '0.195146871009,0.554406130268 0.543295019157,0.554406130268 0.507279693487,0.718390804598 0.183141762452,0.718390804598')}
      </g>
    </svg>`;
  }

  window.CubeNotation = { renderCmll };
}());
