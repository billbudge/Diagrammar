let simpleIteration = {
  "type": "circuit",
  "id": 1,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430.60454734008107,
  "name": "Example",
  "items": [
    {
      "type": "element",
      "elementType": "input",
      "master": "[,*]",
      "x": 16,
      "y": 16,
      "state": "palette",
      "id": 2
    },
    {
      "type": "element",
      "elementType": "output",
      "master": "[*,]",
      "x": 56,
      "y": 16,
      "state": "palette",
      "id": 3
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[*(λ),]",
      "x": 96,
      "y": 16,
      "state": "palette",
      "id": 4
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(0)]",
      "x": 136,
      "y": 16,
      "state": "palette",
      "id": 5
    },
    {
      "name": "!",
      "type": "element",
      "master": "[v,v](!)",
      "x": 16,
      "y": 56,
      "state": "palette",
      "id": 6
    },
    {
      "name": "~",
      "type": "element",
      "master": "[v,v](~)",
      "x": 64,
      "y": 56,
      "state": "palette",
      "id": 7
    },
    {
      "name": "-",
      "type": "element",
      "master": "[v,v](-)",
      "x": 112,
      "y": 56,
      "state": "palette",
      "id": 8
    },
    {
      "name": "+",
      "type": "element",
      "master": "[vv,v](+)",
      "x": 160,
      "y": 56,
      "state": "palette",
      "id": 9
    },
    {
      "name": "-",
      "type": "element",
      "master": "[vv,v](-)",
      "x": 208,
      "y": 56,
      "state": "palette",
      "id": 10
    },
    {
      "name": "*",
      "type": "element",
      "master": "[vv,v](*)",
      "x": 256,
      "y": 56,
      "state": "palette",
      "id": 11
    },
    {
      "name": "/",
      "type": "element",
      "master": "[vv,v](/)",
      "x": 16,
      "y": 112,
      "state": "palette",
      "id": 12
    },
    {
      "name": "%",
      "type": "element",
      "master": "[vv,v](%)",
      "x": 64,
      "y": 112,
      "state": "palette",
      "id": 13
    },
    {
      "name": "==",
      "type": "element",
      "master": "[vv,v](==)",
      "x": 112,
      "y": 112,
      "state": "palette",
      "id": 14
    },
    {
      "name": "!=",
      "type": "element",
      "master": "[vv,v](!=)",
      "x": 160,
      "y": 112,
      "state": "palette",
      "id": 15
    },
    {
      "name": "<",
      "type": "element",
      "master": "[vv,v](<)",
      "x": 208,
      "y": 112,
      "state": "palette",
      "id": 16
    },
    {
      "name": "<=",
      "type": "element",
      "master": "[vv,v](<=)",
      "x": 256,
      "y": 112,
      "state": "palette",
      "id": 17
    },
    {
      "name": ">",
      "type": "element",
      "master": "[vv,v](>)",
      "x": 16,
      "y": 168,
      "state": "palette",
      "id": 18
    },
    {
      "name": ">=",
      "type": "element",
      "master": "[vv,v](>=)",
      "x": 64,
      "y": 168,
      "state": "palette",
      "id": 19
    },
    {
      "name": "|",
      "type": "element",
      "master": "[vv,v](|)",
      "x": 112,
      "y": 168,
      "state": "palette",
      "id": 20
    },
    {
      "name": "&",
      "type": "element",
      "master": "[vv,v](&)",
      "x": 160,
      "y": 168,
      "state": "palette",
      "id": 21
    },
    {
      "name": "||",
      "type": "element",
      "master": "[vv,v](||)",
      "x": 208,
      "y": 168,
      "state": "palette",
      "id": 22
    },
    {
      "name": "&&",
      "type": "element",
      "master": "[vv,v](&&)",
      "x": 256,
      "y": 168,
      "state": "palette",
      "id": 23
    },
    {
      "name": "?",
      "type": "element",
      "master": "[vvv,v](?)",
      "x": 16,
      "y": 224,
      "state": "palette",
      "id": 24
    },
    {
      "name": "@",
      "type": "element",
      "master": "[,[,v][v,v]](@)",
      "x": 64,
      "y": 224,
      "state": "palette",
      "id": 25
    },
    {
      "name": "[ ]",
      "type": "element",
      "master": "[v(n),v(n)[v,v][vv,v]]",
      "x": 112,
      "y": 224,
      "state": "palette",
      "id": 26
    },
    {
      "name": "<",
      "type": "element",
      "master": "[vv,v](<)",
      "x": 581,
      "y": 91,
      "state": "normal",
      "id": 27
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(n)]",
      "x": 432,
      "y": 125,
      "state": "normal",
      "id": 28
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(i)]",
      "x": 486,
      "y": 93,
      "state": "normal",
      "id": 29
    },
    {
      "type": "wire",
      "srcId": 29,
      "srcPin": 0,
      "dstId": 27,
      "dstPin": 0,
      "id": 30
    },
    {
      "type": "wire",
      "dstId": 27,
      "dstPin": 1,
      "srcId": 28,
      "srcPin": 0,
      "id": 31
    },
    {
      "name": "?",
      "type": "element",
      "master": "[vvv,v](?)",
      "x": 658,
      "y": 101,
      "state": "normal",
      "id": 32
    },
    {
      "type": "wire",
      "srcId": 27,
      "srcPin": 0,
      "dstId": 32,
      "dstPin": 0,
      "id": 33
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(0)]",
      "x": 613,
      "y": 165,
      "state": "normal",
      "id": 34
    },
    {
      "type": "wire",
      "srcId": 34,
      "srcPin": 0,
      "dstId": 32,
      "dstPin": 2,
      "id": 35
    },
    {
      "name": "+",
      "type": "element",
      "master": "[vv,v](+)",
      "x": 556,
      "y": 142,
      "state": "normal",
      "id": 36
    },
    {
      "type": "wire",
      "srcId": 36,
      "srcPin": 0,
      "dstId": 32,
      "dstPin": 1,
      "id": 37
    },
    {
      "type": "wire",
      "srcId": 29,
      "srcPin": 0,
      "dstId": 36,
      "dstPin": 0,
      "id": 38
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 722,
      "y": 112,
      "master": "[v,]",
      "id": 39
    },
    {
      "type": "wire",
      "srcId": 32,
      "srcPin": 0,
      "dstId": 39,
      "dstPin": 0,
      "id": 40
    }
  ]
}