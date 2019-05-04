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
      "type": "element",
      "master": "[v,v](!)",
      "x": 16,
      "y": 56,
      "state": "palette",
      "id": 6
    },
    {
      "type": "element",
      "master": "[v,v](~)",
      "x": 64,
      "y": 56,
      "state": "palette",
      "id": 7
    },
    {
      "type": "element",
      "master": "[v,v](-)",
      "x": 112,
      "y": 56,
      "state": "palette",
      "id": 8
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 160,
      "y": 56,
      "state": "palette",
      "id": 9
    },
    {
      "type": "element",
      "master": "[vv,v](-)",
      "x": 208,
      "y": 56,
      "state": "palette",
      "id": 10
    },
    {
      "type": "element",
      "master": "[vv,v](*)",
      "x": 256,
      "y": 56,
      "state": "palette",
      "id": 11
    },
    {
      "type": "element",
      "master": "[vv,v](/)",
      "x": 16,
      "y": 112,
      "state": "palette",
      "id": 12
    },
    {
      "type": "element",
      "master": "[vv,v](%)",
      "x": 64,
      "y": 112,
      "state": "palette",
      "id": 13
    },
    {
      "type": "element",
      "master": "[vv,v](==)",
      "x": 112,
      "y": 112,
      "state": "palette",
      "id": 14
    },
    {
      "type": "element",
      "master": "[vv,v](!=)",
      "x": 160,
      "y": 112,
      "state": "palette",
      "id": 15
    },
    {
      "type": "element",
      "master": "[vv,v](<)",
      "x": 208,
      "y": 112,
      "state": "palette",
      "id": 16
    },
    {
      "type": "element",
      "master": "[vv,v](<=)",
      "x": 256,
      "y": 112,
      "state": "palette",
      "id": 17
    },
    {
      "type": "element",
      "master": "[vv,v](>)",
      "x": 16,
      "y": 168,
      "state": "palette",
      "id": 18
    },
    {
      "type": "element",
      "master": "[vv,v](>=)",
      "x": 64,
      "y": 168,
      "state": "palette",
      "id": 19
    },
    {
      "type": "element",
      "master": "[vv,v](|)",
      "x": 112,
      "y": 168,
      "state": "palette",
      "id": 20
    },
    {
      "type": "element",
      "master": "[vv,v](&)",
      "x": 160,
      "y": 168,
      "state": "palette",
      "id": 21
    },
    {
      "type": "element",
      "master": "[vv,v](||)",
      "x": 208,
      "y": 168,
      "state": "palette",
      "id": 22
    },
    {
      "type": "element",
      "master": "[vv,v](&&)",
      "x": 256,
      "y": 168,
      "state": "palette",
      "id": 23
    },
    {
      "type": "element",
      "master": "[vvv,v](?)",
      "x": 16,
      "y": 224,
      "state": "palette",
      "id": 24
    },
    {
      "type": "element",
      "master": "[v,v[v,v][vv,v]]({})",
      "x": 64,
      "y": 224,
      "state": "palette",
      "id": 25
    },
    {
      "type": "element",
      "master": "[v(n),v(n)[v,v][vv,v]]([])",
      "x": 112,
      "y": 224,
      "state": "palette",
      "id": 26
    },
    {
      "type": "wire",
      "srcId": 111,
      "srcPin": 0,
      "dstId": 112,
      "dstPin": 0,
      "id": 29
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 204,
      "y": 433,
      "master": "[,v]",
      "id": 30
    },
    {
      "type": "wire",
      "srcId": 30,
      "srcPin": 0,
      "dstId": 112,
      "dstPin": 1,
      "id": 31
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 364,
      "y": 417,
      "master": "[v,]",
      "id": 32
    },
    {
      "type": "wire",
      "srcId": 112,
      "srcPin": 0,
      "dstId": 32,
      "dstPin": 0,
      "id": 33
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 206,
      "y": 362,
      "master": "[,v]",
      "id": 34
    },
    {
      "type": "wire",
      "srcId": 34,
      "srcPin": 0,
      "dstId": 111,
      "dstPin": 0,
      "id": 35
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 200,
      "y": 400,
      "master": "[,v]",
      "id": 36
    },
    {
      "type": "wire",
      "srcId": 36,
      "srcPin": 0,
      "dstId": 111,
      "dstPin": 1,
      "id": 37
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 407.2357081505124,
      "y": 101.67883110134784,
      "state": "normal",
      "id": 38
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 457.2357081505124,
      "y": 127.67883110134784,
      "state": "normal",
      "id": 39
    },
    {
      "type": "wire",
      "srcId": 38,
      "srcPin": 0,
      "dstId": 39,
      "dstPin": 0,
      "id": 40,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 408.2357081505124,
      "y": 162.67883110134784,
      "state": "normal",
      "id": 41
    },
    {
      "type": "wire",
      "srcId": 41,
      "srcPin": 0,
      "dstId": 39,
      "dstPin": 1,
      "id": 42
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 372.2357081505124,
      "y": 167.67883110134784,
      "master": "[,v]",
      "id": 43
    },
    {
      "type": "wire",
      "srcId": 43,
      "srcPin": 0,
      "dstId": 41,
      "dstPin": 0,
      "id": 44
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 372.2357081505124,
      "y": 198.67883110134784,
      "master": "[,v]",
      "id": 45
    },
    {
      "type": "wire",
      "srcId": 45,
      "srcPin": 0,
      "dstId": 41,
      "dstPin": 1,
      "id": 46
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 371.2357081505124,
      "y": 107.67883110134784,
      "master": "[,v]",
      "id": 47
    },
    {
      "type": "wire",
      "srcId": 47,
      "srcPin": 0,
      "dstId": 38,
      "dstPin": 0,
      "id": 48
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 371.2357081505124,
      "y": 136.67883110134784,
      "master": "[,v]",
      "id": 49
    },
    {
      "type": "wire",
      "srcId": 49,
      "srcPin": 0,
      "dstId": 38,
      "dstPin": 1,
      "id": 50
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 506.2357081505123,
      "y": 138.67883110134784,
      "master": "[v,]",
      "id": 51
    },
    {
      "type": "wire",
      "srcId": 39,
      "srcPin": 0,
      "dstId": 51,
      "dstPin": 0,
      "id": 52
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](+)",
        "x": 395,
        "y": 48,
        "state": "normal",
        "id": 27
      },
      "elementType": "opened",
      "x": 240,
      "y": 356,
      "id": 111,
      "master": "[vv[vv,v],v]"
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](+)",
        "x": 445,
        "y": 74,
        "state": "normal",
        "id": 28
      },
      "elementType": "opened",
      "x": 299,
      "y": 393,
      "id": 112,
      "master": "[vv[vv,v],v]"
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 830.3129689447981,
      "y": 152.08522846911094,
      "master": "[v,]",
      "state": "normal",
      "id": 323
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 607.3129689447981,
      "y": 181.08522846911094,
      "master": "[,v]",
      "state": "normal",
      "id": 325
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 608.3129689447981,
      "y": 145.08522846911094,
      "master": "[,v]",
      "state": "normal",
      "id": 326
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 609.3129689447981,
      "y": 111.08522846911094,
      "master": "[,v]",
      "state": "normal",
      "id": 328
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 608.3129689447981,
      "y": 75.08522846911094,
      "master": "[,v]",
      "state": "normal",
      "id": 329
    },
    {
      "type": "wire",
      "srcId": 340,
      "srcPin": 0,
      "dstId": 323,
      "dstPin": 0,
      "id": 331,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 328,
      "srcPin": 0,
      "dstId": 338,
      "dstPin": 1,
      "id": 332,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 329,
      "srcPin": 0,
      "dstId": 338,
      "dstPin": 0,
      "id": 333,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 325,
      "srcPin": 0,
      "dstId": 339,
      "dstPin": 1,
      "id": 334,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 326,
      "srcPin": 0,
      "dstId": 339,
      "dstPin": 0,
      "id": 335,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 339,
      "srcPin": 0,
      "dstId": 340,
      "dstPin": 1,
      "id": 336,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 338,
      "srcPin": 0,
      "dstId": 340,
      "dstPin": 0,
      "x": null,
      "y": null,
      "id": 337
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](+)",
        "x": 634,
        "y": 102,
        "state": "normal",
        "id": 327
      },
      "elementType": "opened",
      "x": 677.3129689447981,
      "y": 76.08522846911094,
      "id": 338,
      "master": "[vv[vv,v],v]"
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](+)",
        "x": 635,
        "y": 163,
        "state": "normal",
        "id": 324
      },
      "elementType": "opened",
      "x": 674.3129689447981,
      "y": 146.08522846911094,
      "id": 339,
      "master": "[vv[vv,v],v]"
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](+)",
        "x": 684,
        "y": 128,
        "state": "normal",
        "id": 330
      },
      "elementType": "opened",
      "x": 758.3129689447981,
      "y": 152.08522846911094,
      "id": 340,
      "master": "[vv[vv,v],v]"
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 571.8048270607011,
      "y": 216.50555414447481,
      "master": "[,[vv,v](op)]",
      "id": 341
    },
    {
      "type": "wire",
      "srcId": 341,
      "srcPin": 0,
      "dstId": 339,
      "dstPin": 2,
      "id": 342
    },
    {
      "type": "wire",
      "srcId": 341,
      "srcPin": 0,
      "dstId": 338,
      "dstPin": 2,
      "id": 343
    },
    {
      "type": "wire",
      "srcId": 341,
      "srcPin": 0,
      "dstId": 340,
      "dstPin": 2,
      "id": 344
    },
    {
      "type": "element",
      "x": 520.5,
      "y": 591.5,
      "id": 445,
      "groupItems": [
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 394,
          "y": 31,
          "state": "normal",
          "id": 53
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 456,
          "y": 60,
          "state": "normal",
          "id": 54
        },
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 520,
          "y": 85,
          "state": "normal",
          "id": 56
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 582,
          "y": 114,
          "state": "normal",
          "id": 57
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 642,
          "y": 138,
          "master": "[v,]",
          "id": 70,
          "pinIndex": 0
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 340,
          "y": 111,
          "master": "[,v(c)]",
          "id": 60,
          "pinIndex": 2
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 145,
          "master": "[,v(x)]",
          "id": 68,
          "pinIndex": 3
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 74,
          "master": "[,v(b)]",
          "id": 64,
          "pinIndex": 1
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 337,
          "y": 40,
          "master": "[,v(a)]",
          "id": 66,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 53,
          "srcPin": 0,
          "dstId": 54,
          "dstPin": 0,
          "id": 55
        },
        {
          "type": "wire",
          "srcId": 56,
          "srcPin": 0,
          "dstId": 57,
          "dstPin": 0,
          "id": 58,
          "x": null,
          "y": null
        },
        {
          "type": "wire",
          "srcId": 54,
          "srcPin": 0,
          "dstId": 56,
          "dstPin": 0,
          "id": 59
        },
        {
          "type": "wire",
          "srcId": 64,
          "srcPin": 0,
          "dstId": 54,
          "dstPin": 1,
          "id": 65
        },
        {
          "type": "wire",
          "srcId": 66,
          "srcPin": 0,
          "dstId": 53,
          "dstPin": 0,
          "id": 67
        },
        {
          "type": "wire",
          "srcId": 68,
          "srcPin": 0,
          "dstId": 53,
          "dstPin": 1,
          "id": 69
        },
        {
          "type": "wire",
          "srcId": 57,
          "srcPin": 0,
          "dstId": 70,
          "dstPin": 0,
          "id": 71
        },
        {
          "type": "wire",
          "dstId": 57,
          "dstPin": 1,
          "srcId": 60,
          "srcPin": 0,
          "id": 73
        },
        {
          "type": "wire",
          "srcId": 68,
          "srcPin": 0,
          "dstId": 56,
          "dstPin": 1,
          "id": 74
        }
      ],
      "master": "[v(a)v(b)v(c)v(x),v]"
    },
    {
      "type": "element",
      "x": 520.5,
      "y": 809.5,
      "groupItems": [
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 394,
          "y": 31,
          "state": "normal",
          "id": 446
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 456,
          "y": 60,
          "state": "normal",
          "id": 447
        },
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 520,
          "y": 85,
          "state": "normal",
          "id": 448
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 582,
          "y": 114,
          "state": "normal",
          "id": 449
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 642,
          "y": 138,
          "master": "[v,]",
          "pinIndex": 0,
          "id": 450
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 340,
          "y": 111,
          "master": "[,v(c)]",
          "pinIndex": 2,
          "id": 451
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 145,
          "master": "[,v(x)]",
          "pinIndex": 3,
          "id": 452
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 74,
          "master": "[,v(b)]",
          "pinIndex": 1,
          "id": 453
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 337,
          "y": 40,
          "master": "[,v(a)]",
          "pinIndex": 0,
          "id": 454
        },
        {
          "type": "wire",
          "srcId": 446,
          "srcPin": 0,
          "dstId": 447,
          "dstPin": 0,
          "id": 455
        },
        {
          "type": "wire",
          "srcId": 448,
          "srcPin": 0,
          "dstId": 449,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 456
        },
        {
          "type": "wire",
          "srcId": 447,
          "srcPin": 0,
          "dstId": 448,
          "dstPin": 0,
          "id": 457
        },
        {
          "type": "wire",
          "srcId": 453,
          "srcPin": 0,
          "dstId": 447,
          "dstPin": 1,
          "id": 458
        },
        {
          "type": "wire",
          "srcId": 454,
          "srcPin": 0,
          "dstId": 446,
          "dstPin": 0,
          "id": 459
        },
        {
          "type": "wire",
          "srcId": 452,
          "srcPin": 0,
          "dstId": 446,
          "dstPin": 1,
          "id": 460
        },
        {
          "type": "wire",
          "srcId": 449,
          "srcPin": 0,
          "dstId": 450,
          "dstPin": 0,
          "id": 461
        },
        {
          "type": "wire",
          "dstId": 449,
          "dstPin": 1,
          "srcId": 451,
          "srcPin": 0,
          "id": 462
        },
        {
          "type": "wire",
          "srcId": 452,
          "srcPin": 0,
          "dstId": 448,
          "dstPin": 1,
          "id": 463
        }
      ],
      "master": "[v(a)v(b)v(c)v(x),v]",
      "id": 464,
      "state": "normal"
    },
    {
      "type": "element",
      "x": 520.5,
      "y": 665.5,
      "groupItems": [
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 394,
          "y": 31,
          "state": "normal",
          "id": 465
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 456,
          "y": 60,
          "state": "normal",
          "id": 466
        },
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 520,
          "y": 85,
          "state": "normal",
          "id": 467
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 582,
          "y": 114,
          "state": "normal",
          "id": 468
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 642,
          "y": 138,
          "master": "[v,]",
          "pinIndex": 0,
          "id": 469
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 340,
          "y": 111,
          "master": "[,v(c)]",
          "pinIndex": 2,
          "id": 470
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 145,
          "master": "[,v(x)]",
          "pinIndex": 3,
          "id": 471
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 74,
          "master": "[,v(b)]",
          "pinIndex": 1,
          "id": 472
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 337,
          "y": 40,
          "master": "[,v(a)]",
          "pinIndex": 0,
          "id": 473
        },
        {
          "type": "wire",
          "srcId": 465,
          "srcPin": 0,
          "dstId": 466,
          "dstPin": 0,
          "id": 474
        },
        {
          "type": "wire",
          "srcId": 467,
          "srcPin": 0,
          "dstId": 468,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 475
        },
        {
          "type": "wire",
          "srcId": 466,
          "srcPin": 0,
          "dstId": 467,
          "dstPin": 0,
          "id": 476
        },
        {
          "type": "wire",
          "srcId": 472,
          "srcPin": 0,
          "dstId": 466,
          "dstPin": 1,
          "id": 477
        },
        {
          "type": "wire",
          "srcId": 473,
          "srcPin": 0,
          "dstId": 465,
          "dstPin": 0,
          "id": 478
        },
        {
          "type": "wire",
          "srcId": 471,
          "srcPin": 0,
          "dstId": 465,
          "dstPin": 1,
          "id": 479
        },
        {
          "type": "wire",
          "srcId": 468,
          "srcPin": 0,
          "dstId": 469,
          "dstPin": 0,
          "id": 480
        },
        {
          "type": "wire",
          "dstId": 468,
          "dstPin": 1,
          "srcId": 470,
          "srcPin": 0,
          "id": 481
        },
        {
          "type": "wire",
          "srcId": 471,
          "srcPin": 0,
          "dstId": 467,
          "dstPin": 1,
          "id": 482
        }
      ],
      "master": "[v(a)v(b)v(c)v(x),v]",
      "state": "normal",
      "id": 483
    },
    {
      "type": "element",
      "x": 519.5,
      "y": 737.5,
      "groupItems": [
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 394,
          "y": 31,
          "state": "normal",
          "id": 484
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 456,
          "y": 60,
          "state": "normal",
          "id": 485
        },
        {
          "type": "element",
          "master": "[vv,v](*)",
          "x": 520,
          "y": 85,
          "state": "normal",
          "id": 486
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 582,
          "y": 114,
          "state": "normal",
          "id": 487
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 642,
          "y": 138,
          "master": "[v,]",
          "pinIndex": 0,
          "id": 488
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 340,
          "y": 111,
          "master": "[,v(c)]",
          "pinIndex": 2,
          "id": 489
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 145,
          "master": "[,v(x)]",
          "pinIndex": 3,
          "id": 490
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 339,
          "y": 74,
          "master": "[,v(b)]",
          "pinIndex": 1,
          "id": 491
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 337,
          "y": 40,
          "master": "[,v(a)]",
          "pinIndex": 0,
          "id": 492
        },
        {
          "type": "wire",
          "srcId": 484,
          "srcPin": 0,
          "dstId": 485,
          "dstPin": 0,
          "id": 493
        },
        {
          "type": "wire",
          "srcId": 486,
          "srcPin": 0,
          "dstId": 487,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 494
        },
        {
          "type": "wire",
          "srcId": 485,
          "srcPin": 0,
          "dstId": 486,
          "dstPin": 0,
          "id": 495
        },
        {
          "type": "wire",
          "srcId": 491,
          "srcPin": 0,
          "dstId": 485,
          "dstPin": 1,
          "id": 496
        },
        {
          "type": "wire",
          "srcId": 492,
          "srcPin": 0,
          "dstId": 484,
          "dstPin": 0,
          "id": 497
        },
        {
          "type": "wire",
          "srcId": 490,
          "srcPin": 0,
          "dstId": 484,
          "dstPin": 1,
          "id": 498
        },
        {
          "type": "wire",
          "srcId": 487,
          "srcPin": 0,
          "dstId": 488,
          "dstPin": 0,
          "id": 499
        },
        {
          "type": "wire",
          "dstId": 487,
          "dstPin": 1,
          "srcId": 489,
          "srcPin": 0,
          "id": 500
        },
        {
          "type": "wire",
          "srcId": 490,
          "srcPin": 0,
          "dstId": 486,
          "dstPin": 1,
          "id": 501
        }
      ],
      "master": "[v(a)v(b)v(c)v(x),v]",
      "state": "normal",
      "id": 502
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 382.5,
      "y": 682,
      "master": "[,v(a)]",
      "id": 503
    },
    {
      "type": "wire",
      "srcId": 503,
      "srcPin": 0,
      "dstId": 445,
      "dstPin": 0,
      "id": 504
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 382.5,
      "y": 714,
      "master": "[,v(b)]",
      "id": 505
    },
    {
      "type": "wire",
      "srcId": 505,
      "srcPin": 0,
      "dstId": 445,
      "dstPin": 1,
      "id": 506
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 378.5,
      "y": 742,
      "master": "[,v(c)]",
      "id": 507
    },
    {
      "type": "wire",
      "srcId": 507,
      "srcPin": 0,
      "dstId": 445,
      "dstPin": 2,
      "id": 508
    },
    {
      "type": "wire",
      "dstId": 483,
      "dstPin": 0,
      "srcId": 503,
      "srcPin": 0,
      "id": 538
    },
    {
      "type": "wire",
      "dstId": 483,
      "dstPin": 1,
      "srcId": 505,
      "srcPin": 0,
      "id": 540
    },
    {
      "type": "wire",
      "dstId": 483,
      "dstPin": 2,
      "srcId": 507,
      "srcPin": 0,
      "id": 541
    },
    {
      "type": "wire",
      "dstId": 502,
      "dstPin": 0,
      "srcId": 503,
      "srcPin": 0,
      "id": 546
    },
    {
      "type": "wire",
      "dstId": 502,
      "dstPin": 1,
      "srcId": 505,
      "srcPin": 0,
      "id": 547
    },
    {
      "type": "wire",
      "dstId": 502,
      "dstPin": 2,
      "srcId": 507,
      "srcPin": 0,
      "id": 548
    },
    {
      "type": "wire",
      "dstId": 464,
      "dstPin": 0,
      "srcId": 503,
      "srcPin": 0,
      "id": 549
    },
    {
      "type": "wire",
      "dstId": 464,
      "dstPin": 1,
      "srcId": 505,
      "srcPin": 0,
      "id": 550
    },
    {
      "type": "wire",
      "dstId": 464,
      "dstPin": 2,
      "srcId": 507,
      "srcPin": 0,
      "id": 551
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x0)]",
      "x": 409,
      "y": 613,
      "state": "normal",
      "id": 571
    },
    {
      "type": "wire",
      "srcId": 571,
      "srcPin": 0,
      "dstId": 445,
      "dstPin": 3,
      "id": 572
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x1)]",
      "x": 401,
      "y": 649,
      "state": "normal",
      "id": 573
    },
    {
      "type": "wire",
      "srcId": 573,
      "srcPin": 0,
      "dstId": 483,
      "dstPin": 3,
      "id": 574
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x2)]",
      "x": 399,
      "y": 801,
      "state": "normal",
      "id": 575
    },
    {
      "type": "wire",
      "srcId": 575,
      "srcPin": 0,
      "dstId": 502,
      "dstPin": 3,
      "id": 576
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x3)]",
      "x": 405,
      "y": 848,
      "state": "normal",
      "id": 577
    },
    {
      "type": "wire",
      "srcId": 577,
      "srcPin": 0,
      "dstId": 464,
      "dstPin": 3,
      "id": 578
    },
    {
      "type": "element",
      "x": 542.3513671875,
      "y": 478.20000000000005,
      "id": 592,
      "groupItems": [
        {
          "type": "element",
          "x": 691.5,
          "y": 538.6,
          "id": 389,
          "groupItems": [
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 101,
              "master": "[,v]",
              "pinIndex": 0,
              "state": "normal",
              "id": 367
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 582,
              "y": 137,
              "master": "[,v]",
              "pinIndex": 1,
              "state": "normal",
              "id": 368
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 171,
              "master": "[,v]",
              "pinIndex": 2,
              "state": "normal",
              "id": 369
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 580,
              "y": 207,
              "master": "[,v]",
              "pinIndex": 3,
              "state": "normal",
              "id": 370
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 635,
                "y": 163,
                "state": "normal",
                "id": 371
              },
              "elementType": "opened",
              "x": 647,
              "y": 172,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 372
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 570,
              "y": 241.4,
              "master": "[,[vv,v](op)]",
              "state": "normal",
              "id": 373,
              "pinIndex": 4
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 803,
              "y": 178,
              "master": "[v,]",
              "pinIndex": 0,
              "state": "normal",
              "id": 374
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 684,
                "y": 128,
                "state": "normal",
                "id": 375
              },
              "elementType": "opened",
              "x": 731,
              "y": 178,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 376
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 634,
                "y": 102,
                "state": "normal",
                "id": 377
              },
              "elementType": "opened",
              "x": 650,
              "y": 102,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 378
            },
            {
              "type": "wire",
              "srcId": 373,
              "srcPin": 0,
              "dstId": 376,
              "dstPin": 2,
              "id": 379
            },
            {
              "type": "wire",
              "srcId": 373,
              "srcPin": 0,
              "dstId": 378,
              "dstPin": 2,
              "id": 380
            },
            {
              "type": "wire",
              "srcId": 373,
              "srcPin": 0,
              "dstId": 372,
              "dstPin": 2,
              "id": 381
            },
            {
              "type": "wire",
              "srcId": 378,
              "srcPin": 0,
              "dstId": 376,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 382
            },
            {
              "type": "wire",
              "srcId": 372,
              "srcPin": 0,
              "dstId": 376,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 383
            },
            {
              "type": "wire",
              "srcId": 369,
              "srcPin": 0,
              "dstId": 372,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 384
            },
            {
              "type": "wire",
              "srcId": 370,
              "srcPin": 0,
              "dstId": 372,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 385
            },
            {
              "type": "wire",
              "srcId": 367,
              "srcPin": 0,
              "dstId": 378,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 386
            },
            {
              "type": "wire",
              "srcId": 368,
              "srcPin": 0,
              "dstId": 378,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 387
            },
            {
              "type": "wire",
              "srcId": 376,
              "srcPin": 0,
              "dstId": 374,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 388
            }
          ],
          "master": "[vvvv[vv,v](op),v]"
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 788.702734375,
          "y": 551.6,
          "master": "[v,]",
          "id": 590,
          "pinIndex": 0
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 606,
            "y": 583,
            "state": "normal",
            "id": 579
          },
          "elementType": "closed",
          "x": 606,
          "y": 583,
          "id": 580,
          "master": "[,[vv,v](+)]"
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 584.6,
          "master": "[,v]",
          "id": 588,
          "pinIndex": 3
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 573.6,
          "master": "[,v]",
          "id": 586,
          "pinIndex": 2
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 562.6,
          "master": "[,v]",
          "id": 584,
          "pinIndex": 1
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 551.6,
          "master": "[,v]",
          "id": 582,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 580,
          "srcPin": 0,
          "dstId": 389,
          "dstPin": 4,
          "id": 581
        },
        {
          "type": "wire",
          "srcId": 582,
          "srcPin": 0,
          "dstId": 389,
          "dstPin": 0,
          "id": 583
        },
        {
          "type": "wire",
          "srcId": 584,
          "srcPin": 0,
          "dstId": 389,
          "dstPin": 1,
          "id": 585
        },
        {
          "type": "wire",
          "srcId": 586,
          "srcPin": 0,
          "dstId": 389,
          "dstPin": 2,
          "id": 587
        },
        {
          "type": "wire",
          "srcId": 588,
          "srcPin": 0,
          "dstId": 389,
          "dstPin": 3,
          "id": 589
        },
        {
          "type": "wire",
          "srcId": 389,
          "srcPin": 0,
          "dstId": 590,
          "dstPin": 0,
          "id": 591
        }
      ],
      "master": "[vvvv,v](+)"
    },
    {
      "type": "element",
      "x": 621.3513671875,
      "y": 729.2,
      "groupItems": [
        {
          "type": "element",
          "x": 691.5,
          "y": 538.6,
          "groupItems": [
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 101,
              "master": "[,v]",
              "pinIndex": 0,
              "state": "normal",
              "id": 593
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 582,
              "y": 137,
              "master": "[,v]",
              "pinIndex": 1,
              "state": "normal",
              "id": 594
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 171,
              "master": "[,v]",
              "pinIndex": 2,
              "state": "normal",
              "id": 595
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 580,
              "y": 207,
              "master": "[,v]",
              "pinIndex": 3,
              "state": "normal",
              "id": 596
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 635,
                "y": 163,
                "state": "normal",
                "id": 597
              },
              "elementType": "opened",
              "x": 647,
              "y": 172,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 598
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 570,
              "y": 241.4,
              "master": "[,[vv,v](op)]",
              "state": "normal",
              "pinIndex": 4,
              "id": 599
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 803,
              "y": 178,
              "master": "[v,]",
              "pinIndex": 0,
              "state": "normal",
              "id": 600
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 684,
                "y": 128,
                "state": "normal",
                "id": 601
              },
              "elementType": "opened",
              "x": 731,
              "y": 178,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 602
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 634,
                "y": 102,
                "state": "normal",
                "id": 603
              },
              "elementType": "opened",
              "x": 650,
              "y": 102,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 604
            },
            {
              "type": "wire",
              "srcId": 599,
              "srcPin": 0,
              "dstId": 602,
              "dstPin": 2,
              "id": 605
            },
            {
              "type": "wire",
              "srcId": 599,
              "srcPin": 0,
              "dstId": 604,
              "dstPin": 2,
              "id": 606
            },
            {
              "type": "wire",
              "srcId": 599,
              "srcPin": 0,
              "dstId": 598,
              "dstPin": 2,
              "id": 607
            },
            {
              "type": "wire",
              "srcId": 604,
              "srcPin": 0,
              "dstId": 602,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 608
            },
            {
              "type": "wire",
              "srcId": 598,
              "srcPin": 0,
              "dstId": 602,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 609
            },
            {
              "type": "wire",
              "srcId": 595,
              "srcPin": 0,
              "dstId": 598,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 610
            },
            {
              "type": "wire",
              "srcId": 596,
              "srcPin": 0,
              "dstId": 598,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 611
            },
            {
              "type": "wire",
              "srcId": 593,
              "srcPin": 0,
              "dstId": 604,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 612
            },
            {
              "type": "wire",
              "srcId": 594,
              "srcPin": 0,
              "dstId": 604,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 613
            },
            {
              "type": "wire",
              "srcId": 602,
              "srcPin": 0,
              "dstId": 600,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 614
            }
          ],
          "master": "[vvvv[vv,v](op),v]",
          "id": 615
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 788.702734375,
          "y": 551.6,
          "master": "[v,]",
          "pinIndex": 0,
          "id": 616
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 606,
            "y": 583,
            "state": "normal",
            "id": 617
          },
          "elementType": "closed",
          "x": 606,
          "y": 583,
          "master": "[,[vv,v](+)]",
          "id": 618
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 584.6,
          "master": "[,v]",
          "pinIndex": 3,
          "id": 619
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 573.6,
          "master": "[,v]",
          "pinIndex": 2,
          "id": 620
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 562.6,
          "master": "[,v]",
          "pinIndex": 1,
          "id": 621
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 551.6,
          "master": "[,v]",
          "pinIndex": 0,
          "id": 622
        },
        {
          "type": "wire",
          "srcId": 618,
          "srcPin": 0,
          "dstId": 615,
          "dstPin": 4,
          "id": 623
        },
        {
          "type": "wire",
          "srcId": 622,
          "srcPin": 0,
          "dstId": 615,
          "dstPin": 0,
          "id": 624
        },
        {
          "type": "wire",
          "srcId": 621,
          "srcPin": 0,
          "dstId": 615,
          "dstPin": 1,
          "id": 625
        },
        {
          "type": "wire",
          "srcId": 620,
          "srcPin": 0,
          "dstId": 615,
          "dstPin": 2,
          "id": 626
        },
        {
          "type": "wire",
          "srcId": 619,
          "srcPin": 0,
          "dstId": 615,
          "dstPin": 3,
          "id": 627
        },
        {
          "type": "wire",
          "srcId": 615,
          "srcPin": 0,
          "dstId": 616,
          "dstPin": 0,
          "id": 628
        }
      ],
      "master": "[vvvv,v](+)",
      "id": 629,
      "state": "normal"
    },
    {
      "type": "wire",
      "srcId": 445,
      "srcPin": 0,
      "dstId": 629,
      "dstPin": 0,
      "id": 630
    },
    {
      "type": "wire",
      "srcId": 483,
      "srcPin": 0,
      "dstId": 629,
      "dstPin": 1,
      "id": 631
    },
    {
      "type": "wire",
      "dstId": 629,
      "dstPin": 2,
      "srcId": 502,
      "srcPin": 0,
      "id": 632
    },
    {
      "type": "wire",
      "dstId": 629,
      "dstPin": 3,
      "srcId": 464,
      "srcPin": 0,
      "id": 633
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 785.5,
      "y": 606,
      "master": "[,v(a)]",
      "id": 634,
      "state": "normal"
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 790.5,
      "y": 639,
      "master": "[,v(b)]",
      "id": 635,
      "state": "normal"
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 791.5,
      "y": 671,
      "master": "[,v(c)]",
      "id": 636,
      "state": "normal"
    },
    {
      "type": "wire",
      "dstId": 659,
      "dstPin": 2,
      "srcId": 636,
      "srcPin": 0,
      "id": 656,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "dstId": 659,
      "dstPin": 1,
      "srcId": 635,
      "srcPin": 0,
      "id": 657,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "dstId": 659,
      "dstPin": 0,
      "srcId": 634,
      "srcPin": 0,
      "id": 658,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "x": 712.5,
        "y": 76.5,
        "groupItems": [
          {
            "type": "element",
            "master": "[vv,v](*)",
            "x": 394,
            "y": 31,
            "state": "normal",
            "id": 637
          },
          {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 456,
            "y": 60,
            "state": "normal",
            "id": 638
          },
          {
            "type": "element",
            "master": "[vv,v](*)",
            "x": 520,
            "y": 85,
            "state": "normal",
            "id": 639
          },
          {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 582,
            "y": 114,
            "state": "normal",
            "id": 640
          },
          {
            "type": "element",
            "elementType": "output",
            "x": 642,
            "y": 138,
            "master": "[v,]",
            "pinIndex": 0,
            "id": 641
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 340,
            "y": 111,
            "master": "[,v(c)]",
            "pinIndex": 2,
            "id": 642
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 339,
            "y": 145,
            "master": "[,v(x)]",
            "pinIndex": 3,
            "id": 643
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 339,
            "y": 74,
            "master": "[,v(b)]",
            "pinIndex": 1,
            "id": 644
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 337,
            "y": 40,
            "master": "[,v(a)]",
            "pinIndex": 0,
            "id": 645
          },
          {
            "type": "wire",
            "srcId": 637,
            "srcPin": 0,
            "dstId": 638,
            "dstPin": 0,
            "id": 646
          },
          {
            "type": "wire",
            "srcId": 639,
            "srcPin": 0,
            "dstId": 640,
            "dstPin": 0,
            "x": null,
            "y": null,
            "id": 647
          },
          {
            "type": "wire",
            "srcId": 638,
            "srcPin": 0,
            "dstId": 639,
            "dstPin": 0,
            "id": 648
          },
          {
            "type": "wire",
            "srcId": 644,
            "srcPin": 0,
            "dstId": 638,
            "dstPin": 1,
            "id": 649
          },
          {
            "type": "wire",
            "srcId": 645,
            "srcPin": 0,
            "dstId": 637,
            "dstPin": 0,
            "id": 650
          },
          {
            "type": "wire",
            "srcId": 643,
            "srcPin": 0,
            "dstId": 637,
            "dstPin": 1,
            "id": 651
          },
          {
            "type": "wire",
            "srcId": 640,
            "srcPin": 0,
            "dstId": 641,
            "dstPin": 0,
            "id": 652
          },
          {
            "type": "wire",
            "dstId": 640,
            "dstPin": 1,
            "srcId": 642,
            "srcPin": 0,
            "id": 653
          },
          {
            "type": "wire",
            "srcId": 643,
            "srcPin": 0,
            "dstId": 639,
            "dstPin": 1,
            "id": 654
          }
        ],
        "master": "[v(a)v(b)v(c)v(x),v]",
        "state": "normal",
        "id": 655
      },
      "elementType": "closed",
      "x": 870.5,
      "y": 627.5,
      "id": 659,
      "master": "[v(a)v(b)v(c),[v,v]]"
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x0)]",
      "x": 942,
      "y": 561,
      "state": "normal",
      "id": 660
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x1)]",
      "x": 941,
      "y": 604,
      "state": "normal",
      "id": 661
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x2)]",
      "x": 942,
      "y": 668,
      "state": "normal",
      "id": 662
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(x3)]",
      "x": 941,
      "y": 712,
      "state": "normal",
      "id": 663
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[v*,v]",
      "x": 1024,
      "y": 569,
      "state": "normal",
      "id": 664
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[v*,v]",
      "x": 1023,
      "y": 614,
      "state": "normal",
      "id": 666
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[v*,v]",
      "x": 1025,
      "y": 661,
      "state": "normal",
      "id": 667
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[v*,v]",
      "x": 1025,
      "y": 707,
      "state": "normal",
      "id": 668
    },
    {
      "type": "wire",
      "srcId": 659,
      "srcPin": 0,
      "dstId": 664,
      "dstPin": 1,
      "id": 669
    },
    {
      "type": "wire",
      "srcId": 659,
      "srcPin": 0,
      "dstId": 666,
      "dstPin": 1,
      "id": 670
    },
    {
      "type": "wire",
      "srcId": 659,
      "srcPin": 0,
      "dstId": 667,
      "dstPin": 1,
      "id": 671
    },
    {
      "type": "wire",
      "srcId": 659,
      "srcPin": 0,
      "dstId": 668,
      "dstPin": 1,
      "id": 672
    },
    {
      "type": "wire",
      "srcId": 663,
      "srcPin": 0,
      "dstId": 668,
      "dstPin": 0,
      "id": 673
    },
    {
      "type": "wire",
      "srcId": 662,
      "srcPin": 0,
      "dstId": 667,
      "dstPin": 0,
      "id": 674
    },
    {
      "type": "wire",
      "srcId": 661,
      "srcPin": 0,
      "dstId": 666,
      "dstPin": 0,
      "id": 675
    },
    {
      "type": "wire",
      "srcId": 660,
      "srcPin": 0,
      "dstId": 664,
      "dstPin": 0,
      "id": 676
    },
    {
      "type": "element",
      "x": 1091.3513671875,
      "y": 620.2,
      "groupItems": [
        {
          "type": "element",
          "x": 691.5,
          "y": 538.6,
          "groupItems": [
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 101,
              "master": "[,v]",
              "pinIndex": 0,
              "state": "normal",
              "id": 677
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 582,
              "y": 137,
              "master": "[,v]",
              "pinIndex": 1,
              "state": "normal",
              "id": 678
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 581,
              "y": 171,
              "master": "[,v]",
              "pinIndex": 2,
              "state": "normal",
              "id": 679
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 580,
              "y": 207,
              "master": "[,v]",
              "pinIndex": 3,
              "state": "normal",
              "id": 680
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 635,
                "y": 163,
                "state": "normal",
                "id": 681
              },
              "elementType": "opened",
              "x": 647,
              "y": 172,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 682
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 570,
              "y": 241.4,
              "master": "[,[vv,v](op)]",
              "state": "normal",
              "pinIndex": 4,
              "id": 683
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 803,
              "y": 178,
              "master": "[v,]",
              "pinIndex": 0,
              "state": "normal",
              "id": 684
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 684,
                "y": 128,
                "state": "normal",
                "id": 685
              },
              "elementType": "opened",
              "x": 731,
              "y": 178,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 686
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 634,
                "y": 102,
                "state": "normal",
                "id": 687
              },
              "elementType": "opened",
              "x": 650,
              "y": 102,
              "master": "[vv[vv,v],v]",
              "state": "normal",
              "id": 688
            },
            {
              "type": "wire",
              "srcId": 683,
              "srcPin": 0,
              "dstId": 686,
              "dstPin": 2,
              "id": 689
            },
            {
              "type": "wire",
              "srcId": 683,
              "srcPin": 0,
              "dstId": 688,
              "dstPin": 2,
              "id": 690
            },
            {
              "type": "wire",
              "srcId": 683,
              "srcPin": 0,
              "dstId": 682,
              "dstPin": 2,
              "id": 691
            },
            {
              "type": "wire",
              "srcId": 688,
              "srcPin": 0,
              "dstId": 686,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 692
            },
            {
              "type": "wire",
              "srcId": 682,
              "srcPin": 0,
              "dstId": 686,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 693
            },
            {
              "type": "wire",
              "srcId": 679,
              "srcPin": 0,
              "dstId": 682,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 694
            },
            {
              "type": "wire",
              "srcId": 680,
              "srcPin": 0,
              "dstId": 682,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 695
            },
            {
              "type": "wire",
              "srcId": 677,
              "srcPin": 0,
              "dstId": 688,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 696
            },
            {
              "type": "wire",
              "srcId": 678,
              "srcPin": 0,
              "dstId": 688,
              "dstPin": 1,
              "x": null,
              "y": null,
              "id": 697
            },
            {
              "type": "wire",
              "srcId": 686,
              "srcPin": 0,
              "dstId": 684,
              "dstPin": 0,
              "x": null,
              "y": null,
              "id": 698
            }
          ],
          "master": "[vvvv[vv,v](op),v]",
          "id": 699
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 788.702734375,
          "y": 551.6,
          "master": "[v,]",
          "pinIndex": 0,
          "id": 700
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 606,
            "y": 583,
            "state": "normal",
            "id": 701
          },
          "elementType": "closed",
          "x": 606,
          "y": 583,
          "master": "[,[vv,v](+)]",
          "id": 702
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 584.6,
          "master": "[,v]",
          "pinIndex": 3,
          "id": 703
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 573.6,
          "master": "[,v]",
          "pinIndex": 2,
          "id": 704
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 562.6,
          "master": "[,v]",
          "pinIndex": 1,
          "id": 705
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 659.5,
          "y": 551.6,
          "master": "[,v]",
          "pinIndex": 0,
          "id": 706
        },
        {
          "type": "wire",
          "srcId": 702,
          "srcPin": 0,
          "dstId": 699,
          "dstPin": 4,
          "id": 707
        },
        {
          "type": "wire",
          "srcId": 706,
          "srcPin": 0,
          "dstId": 699,
          "dstPin": 0,
          "id": 708
        },
        {
          "type": "wire",
          "srcId": 705,
          "srcPin": 0,
          "dstId": 699,
          "dstPin": 1,
          "id": 709
        },
        {
          "type": "wire",
          "srcId": 704,
          "srcPin": 0,
          "dstId": 699,
          "dstPin": 2,
          "id": 710
        },
        {
          "type": "wire",
          "srcId": 703,
          "srcPin": 0,
          "dstId": 699,
          "dstPin": 3,
          "id": 711
        },
        {
          "type": "wire",
          "srcId": 699,
          "srcPin": 0,
          "dstId": 700,
          "dstPin": 0,
          "id": 712
        }
      ],
      "master": "[vvvv,v](+)",
      "state": "normal",
      "id": 713
    },
    {
      "type": "wire",
      "srcId": 664,
      "srcPin": 0,
      "dstId": 713,
      "dstPin": 0,
      "id": 714
    },
    {
      "type": "wire",
      "dstId": 713,
      "dstPin": 1,
      "srcId": 666,
      "srcPin": 0,
      "id": 715
    },
    {
      "type": "wire",
      "srcId": 667,
      "srcPin": 0,
      "dstId": 713,
      "dstPin": 2,
      "id": 716
    },
    {
      "type": "wire",
      "srcId": 668,
      "srcPin": 0,
      "dstId": 713,
      "dstPin": 3,
      "id": 717
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(i)]",
      "x": -44,
      "y": 677,
      "state": "normal",
      "id": 965
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(f0)]",
      "x": -52,
      "y": 780,
      "state": "normal",
      "id": 966
    },
    {
      "type": "element",
      "elementType": "input",
      "master": "[,v(f1)]",
      "x": -52,
      "y": 814,
      "state": "normal",
      "id": 967
    },
    {
      "type": "element",
      "master": "[vv,v](<=)",
      "x": 101,
      "y": 663,
      "state": "normal",
      "id": 968
    },
    {
      "type": "wire",
      "srcId": 965,
      "srcPin": 0,
      "dstId": 968,
      "dstPin": 0,
      "id": 969
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(0)]",
      "x": 25,
      "y": 702,
      "state": "normal",
      "id": 970
    },
    {
      "type": "wire",
      "srcId": 970,
      "srcPin": 0,
      "dstId": 968,
      "dstPin": 1,
      "id": 971
    },
    {
      "type": "element",
      "master": "[vvv,v](?)",
      "x": 198,
      "y": 675,
      "state": "normal",
      "id": 972
    },
    {
      "type": "wire",
      "srcId": 968,
      "srcPin": 0,
      "dstId": 972,
      "dstPin": 0,
      "id": 973
    },
    {
      "type": "wire",
      "srcId": 966,
      "srcPin": 0,
      "dstId": 972,
      "dstPin": 1,
      "id": 974
    },
    {
      "type": "element",
      "x": -17.0986328125,
      "y": 739,
      "id": 982,
      "groupItems": [
        {
          "type": "element",
          "elementType": "output",
          "x": 446,
          "y": 228,
          "master": "[v(-1),]",
          "id": 980,
          "pinIndex": 0
        },
        {
          "type": "element",
          "master": "[vv,v](-)",
          "x": 386,
          "y": 204,
          "state": "normal",
          "id": 975
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v(1)]",
          "x": 339,
          "y": 247,
          "state": "normal",
          "id": 976
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 354,
          "y": 228,
          "master": "[,v]",
          "id": 978,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 976,
          "srcPin": 0,
          "dstId": 975,
          "dstPin": 1,
          "id": 977
        },
        {
          "type": "wire",
          "srcId": 978,
          "srcPin": 0,
          "dstId": 975,
          "dstPin": 0,
          "id": 979
        },
        {
          "type": "wire",
          "srcId": 975,
          "srcPin": 0,
          "dstId": 980,
          "dstPin": 0,
          "id": 981
        }
      ],
      "master": "[v,v(-1)]"
    },
    {
      "type": "wire",
      "dstId": 982,
      "dstPin": 0,
      "srcId": 965,
      "srcPin": 0,
      "id": 984
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 265,
      "y": 686,
      "master": "[v,]",
      "id": 987
    },
    {
      "type": "wire",
      "srcId": 972,
      "srcPin": 0,
      "dstId": 987,
      "dstPin": 0,
      "id": 988
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 57,
      "y": 826,
      "state": "normal",
      "id": 990
    },
    {
      "type": "wire",
      "srcId": 966,
      "srcPin": 0,
      "dstId": 990,
      "dstPin": 0,
      "id": 991
    },
    {
      "type": "wire",
      "dstId": 990,
      "dstPin": 1,
      "srcId": 967,
      "srcPin": 0,
      "id": 992
    },
    {
      "type": "element",
      "x": 116.5,
      "y": 765.5,
      "id": 997,
      "master": "[v(i)v(f0)v(f1),v](@)"
    },
    {
      "type": "wire",
      "srcId": 997,
      "srcPin": 0,
      "dstId": 972,
      "dstPin": 2,
      "id": 999
    },
    {
      "type": "wire",
      "dstId": 997,
      "dstPin": 0,
      "srcId": 982,
      "srcPin": 0,
      "id": 1000
    },
    {
      "type": "wire",
      "dstId": 997,
      "dstPin": 1,
      "srcId": 967,
      "srcPin": 0,
      "id": 1001
    },
    {
      "type": "wire",
      "srcId": 990,
      "srcPin": 0,
      "dstId": 997,
      "dstPin": 2,
      "id": 1002
    },
    {
      "type": "element",
      "x": 191.9013671875,
      "y": 16.5,
      "id": 1024,
      "groupItems": [
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v(1)]",
          "x": 463,
          "y": 218,
          "state": "normal",
          "id": 1004
        },
        {
          "type": "element",
          "master": "[vv,v](+)",
          "x": 517,
          "y": 190,
          "state": "normal",
          "id": 1018
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 577,
          "y": 214,
          "master": "[v(+1),]",
          "id": 1022,
          "pinIndex": 0
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 460,
          "y": 172,
          "master": "[,v]",
          "id": 1020,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 1004,
          "srcPin": 0,
          "dstId": 1018,
          "dstPin": 1,
          "id": 1019
        },
        {
          "type": "wire",
          "srcId": 1020,
          "srcPin": 0,
          "dstId": 1018,
          "dstPin": 0,
          "id": 1021
        },
        {
          "type": "wire",
          "srcId": 1018,
          "srcPin": 0,
          "dstId": 1022,
          "dstPin": 0,
          "id": 1023
        }
      ],
      "master": "[v,v(+1)]",
      "state": "palette"
    },
    {
      "type": "element",
      "x": 889,
      "y": 335.6,
      "id": 1040,
      "groupItems": [
        {
          "type": "element",
          "elementType": "input",
          "x": 443,
          "y": 220.4,
          "master": "[,[vv,v](f)]",
          "id": 1038,
          "pinIndex": 3
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 553,
            "y": 107,
            "state": "normal",
            "id": 1015
          },
          "elementType": "opened",
          "x": 598,
          "y": 141,
          "id": 1037,
          "master": "[vv[vv,v],v]"
        },
        {
          "type": "element",
          "master": "[vvv,v](?)",
          "x": 612,
          "y": 40,
          "state": "normal",
          "id": 1009
        },
        {
          "type": "element",
          "elementType": "output",
          "master": "[v,]",
          "x": 699,
          "y": 49,
          "state": "normal",
          "id": 1013,
          "pinIndex": 0
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(f0)]",
          "x": 371,
          "y": 123,
          "state": "normal",
          "id": 1011,
          "pinIndex": 2
        },
        {
          "type": "element",
          "master": "[vv,v](<)",
          "x": 554,
          "y": 30,
          "state": "normal",
          "id": 1006
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(n)]",
          "x": 372,
          "y": 85,
          "state": "normal",
          "id": 1005,
          "pinIndex": 1
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(i)]",
          "x": 371,
          "y": 38,
          "state": "normal",
          "id": 1003,
          "pinIndex": 0
        },
        {
          "type": "element",
          "x": 456.9013671875,
          "y": 156.5,
          "groupItems": [
            {
              "type": "element",
              "elementType": "literal",
              "master": "[,v(1)]",
              "x": 463,
              "y": 218,
              "state": "normal",
              "id": 1025
            },
            {
              "type": "element",
              "master": "[vv,v](+)",
              "x": 517,
              "y": 190,
              "state": "normal",
              "id": 1026
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 577,
              "y": 214,
              "master": "[v(+1),]",
              "pinIndex": 0,
              "id": 1027
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 460,
              "y": 172,
              "master": "[,v]",
              "pinIndex": 0,
              "id": 1028
            },
            {
              "type": "wire",
              "srcId": 1025,
              "srcPin": 0,
              "dstId": 1026,
              "dstPin": 1,
              "id": 1029
            },
            {
              "type": "wire",
              "srcId": 1028,
              "srcPin": 0,
              "dstId": 1026,
              "dstPin": 0,
              "id": 1030
            },
            {
              "type": "wire",
              "srcId": 1026,
              "srcPin": 0,
              "dstId": 1027,
              "dstPin": 0,
              "id": 1031
            }
          ],
          "master": "[v,v(+1)]",
          "state": "normal",
          "id": 1032
        },
        {
          "type": "element",
          "x": 524,
          "y": 161.75,
          "id": 1034,
          "master": "[v(i),v](@)"
        },
        {
          "type": "wire",
          "srcId": 1003,
          "srcPin": 0,
          "dstId": 1006,
          "dstPin": 0,
          "id": 1007
        },
        {
          "type": "wire",
          "srcId": 1005,
          "srcPin": 0,
          "dstId": 1006,
          "dstPin": 1,
          "id": 1008
        },
        {
          "type": "wire",
          "srcId": 1006,
          "srcPin": 0,
          "dstId": 1009,
          "dstPin": 0,
          "id": 1010
        },
        {
          "type": "wire",
          "srcId": 1011,
          "srcPin": 0,
          "dstId": 1009,
          "dstPin": 2,
          "id": 1012
        },
        {
          "type": "wire",
          "srcId": 1009,
          "srcPin": 0,
          "dstId": 1013,
          "dstPin": 0,
          "id": 1014
        },
        {
          "type": "wire",
          "srcId": 1003,
          "srcPin": 0,
          "dstId": 1037,
          "dstPin": 0,
          "id": 1016
        },
        {
          "type": "wire",
          "srcId": 1037,
          "srcPin": 0,
          "dstId": 1009,
          "dstPin": 1,
          "id": 1017
        },
        {
          "type": "wire",
          "srcId": 1003,
          "srcPin": 0,
          "dstId": 1032,
          "dstPin": 0,
          "id": 1033
        },
        {
          "type": "wire",
          "srcId": 1034,
          "srcPin": 0,
          "dstId": 1037,
          "dstPin": 1,
          "id": 1035
        },
        {
          "type": "wire",
          "srcId": 1032,
          "srcPin": 0,
          "dstId": 1034,
          "dstPin": 0,
          "id": 1036
        },
        {
          "type": "wire",
          "srcId": 1038,
          "srcPin": 0,
          "dstId": 1037,
          "dstPin": 2,
          "id": 1039
        }
      ],
      "master": "[v(i)v(n)v(f0)[vv,v](f),v]"
    },
    {
      "type": "element",
      "x": 1142,
      "y": 334.6,
      "groupItems": [
        {
          "type": "element",
          "elementType": "input",
          "x": 443,
          "y": 220.4,
          "master": "[,[vv,v](f)]",
          "pinIndex": 3,
          "id": 1041
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 553,
            "y": 107,
            "state": "normal",
            "id": 1042
          },
          "elementType": "opened",
          "x": 598,
          "y": 141,
          "master": "[vv[vv,v],v]",
          "id": 1043
        },
        {
          "type": "element",
          "master": "[vvv,v](?)",
          "x": 612,
          "y": 40,
          "state": "normal",
          "id": 1044
        },
        {
          "type": "element",
          "elementType": "output",
          "master": "[v,]",
          "x": 699,
          "y": 49,
          "state": "normal",
          "pinIndex": 0,
          "id": 1045
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(f0)]",
          "x": 371,
          "y": 123,
          "state": "normal",
          "pinIndex": 2,
          "id": 1046
        },
        {
          "type": "element",
          "master": "[vv,v](<)",
          "x": 554,
          "y": 30,
          "state": "normal",
          "id": 1047
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(n)]",
          "x": 372,
          "y": 85,
          "state": "normal",
          "pinIndex": 1,
          "id": 1048
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(i)]",
          "x": 371,
          "y": 38,
          "state": "normal",
          "pinIndex": 0,
          "id": 1049
        },
        {
          "type": "element",
          "x": 456.9013671875,
          "y": 156.5,
          "groupItems": [
            {
              "type": "element",
              "elementType": "literal",
              "master": "[,v(1)]",
              "x": 463,
              "y": 218,
              "state": "normal",
              "id": 1050
            },
            {
              "type": "element",
              "master": "[vv,v](+)",
              "x": 517,
              "y": 190,
              "state": "normal",
              "id": 1051
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 577,
              "y": 214,
              "master": "[v(+1),]",
              "pinIndex": 0,
              "id": 1052
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 460,
              "y": 172,
              "master": "[,v]",
              "pinIndex": 0,
              "id": 1053
            },
            {
              "type": "wire",
              "srcId": 1050,
              "srcPin": 0,
              "dstId": 1051,
              "dstPin": 1,
              "id": 1054
            },
            {
              "type": "wire",
              "srcId": 1053,
              "srcPin": 0,
              "dstId": 1051,
              "dstPin": 0,
              "id": 1055
            },
            {
              "type": "wire",
              "srcId": 1051,
              "srcPin": 0,
              "dstId": 1052,
              "dstPin": 0,
              "id": 1056
            }
          ],
          "master": "[v,v(+1)]",
          "state": "normal",
          "id": 1057
        },
        {
          "type": "element",
          "x": 524,
          "y": 161.75,
          "master": "[v(i),v](@)",
          "id": 1058
        },
        {
          "type": "wire",
          "srcId": 1049,
          "srcPin": 0,
          "dstId": 1047,
          "dstPin": 0,
          "id": 1059
        },
        {
          "type": "wire",
          "srcId": 1048,
          "srcPin": 0,
          "dstId": 1047,
          "dstPin": 1,
          "id": 1060
        },
        {
          "type": "wire",
          "srcId": 1047,
          "srcPin": 0,
          "dstId": 1044,
          "dstPin": 0,
          "id": 1061
        },
        {
          "type": "wire",
          "srcId": 1046,
          "srcPin": 0,
          "dstId": 1044,
          "dstPin": 2,
          "id": 1062
        },
        {
          "type": "wire",
          "srcId": 1044,
          "srcPin": 0,
          "dstId": 1045,
          "dstPin": 0,
          "id": 1063
        },
        {
          "type": "wire",
          "srcId": 1049,
          "srcPin": 0,
          "dstId": 1043,
          "dstPin": 0,
          "id": 1064
        },
        {
          "type": "wire",
          "srcId": 1043,
          "srcPin": 0,
          "dstId": 1044,
          "dstPin": 1,
          "id": 1065
        },
        {
          "type": "wire",
          "srcId": 1049,
          "srcPin": 0,
          "dstId": 1057,
          "dstPin": 0,
          "id": 1066
        },
        {
          "type": "wire",
          "srcId": 1058,
          "srcPin": 0,
          "dstId": 1043,
          "dstPin": 1,
          "id": 1067
        },
        {
          "type": "wire",
          "srcId": 1057,
          "srcPin": 0,
          "dstId": 1058,
          "dstPin": 0,
          "id": 1068
        },
        {
          "type": "wire",
          "srcId": 1041,
          "srcPin": 0,
          "dstId": 1043,
          "dstPin": 2,
          "id": 1069
        }
      ],
      "master": "[v(i)v(n)v(f0)[vv,v](f),v]",
      "id": 1070,
      "state": "normal"
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 1024,
      "y": 344.1,
      "master": "[,v(n)]",
      "id": 1073
    },
    {
      "type": "wire",
      "srcId": 1073,
      "srcPin": 0,
      "dstId": 1070,
      "dstPin": 1,
      "id": 1074
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 1230.8013671875,
      "y": 347.6,
      "master": "[v(n!),]",
      "id": 1079
    },
    {
      "type": "wire",
      "srcId": 1070,
      "srcPin": 0,
      "dstId": 1079,
      "dstPin": 0,
      "id": 1080
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(1)]",
      "x": 1085,
      "y": 317,
      "state": "normal",
      "id": 1082
    },
    {
      "type": "wire",
      "srcId": 1082,
      "srcPin": 0,
      "dstId": 1070,
      "dstPin": 0,
      "id": 1083
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(1)]",
      "x": 1087,
      "y": 372,
      "state": "normal",
      "id": 1084
    },
    {
      "type": "wire",
      "srcId": 1084,
      "srcPin": 0,
      "dstId": 1070,
      "dstPin": 2,
      "id": 1085
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "master": "[vv,v](*)",
        "x": 643,
        "y": 187,
        "state": "normal",
        "id": 1086
      },
      "elementType": "closed",
      "x": 1073,
      "y": 408,
      "id": 1087,
      "master": "[,[vv,v](*)]"
    },
    {
      "type": "wire",
      "srcId": 1087,
      "srcPin": 0,
      "dstId": 1070,
      "dstPin": 3,
      "id": 1088
    },
    {
      "type": "element",
      "x": 1339.80205078125,
      "y": 362.9,
      "id": 1254,
      "groupItems": [
        {
          "type": "element",
          "elementType": "output",
          "x": 760.8013671875,
          "y": 146.6,
          "master": "[v(n!),]",
          "state": "normal",
          "id": 1213,
          "pinIndex": 0
        },
        {
          "type": "element",
          "x": 672,
          "y": 133.6,
          "groupItems": [
            {
              "type": "element",
              "elementType": "input",
              "x": 443,
              "y": 220.4,
              "master": "[,[vv,v](f)]",
              "pinIndex": 3,
              "id": 1214
            },
            {
              "type": "element",
              "element": {
                "type": "element",
                "master": "[vv,v](+)",
                "x": 553,
                "y": 107,
                "state": "normal",
                "id": 1215
              },
              "elementType": "opened",
              "x": 598,
              "y": 141,
              "master": "[vv[vv,v],v]",
              "id": 1216
            },
            {
              "type": "element",
              "master": "[vvv,v](?)",
              "x": 612,
              "y": 40,
              "state": "normal",
              "id": 1217
            },
            {
              "type": "element",
              "elementType": "output",
              "master": "[v,]",
              "x": 699,
              "y": 49,
              "state": "normal",
              "pinIndex": 0,
              "id": 1218
            },
            {
              "type": "element",
              "elementType": "input",
              "master": "[,v(f0)]",
              "x": 371,
              "y": 123,
              "state": "normal",
              "pinIndex": 2,
              "id": 1219
            },
            {
              "type": "element",
              "master": "[vv,v](<)",
              "x": 554,
              "y": 30,
              "state": "normal",
              "id": 1220
            },
            {
              "type": "element",
              "elementType": "input",
              "master": "[,v(n)]",
              "x": 372,
              "y": 85,
              "state": "normal",
              "pinIndex": 1,
              "id": 1221
            },
            {
              "type": "element",
              "elementType": "input",
              "master": "[,v(i)]",
              "x": 371,
              "y": 38,
              "state": "normal",
              "pinIndex": 0,
              "id": 1222
            },
            {
              "type": "element",
              "x": 456.9013671875,
              "y": 156.5,
              "groupItems": [
                {
                  "type": "element",
                  "elementType": "literal",
                  "master": "[,v(1)]",
                  "x": 463,
                  "y": 218,
                  "state": "normal",
                  "id": 1223
                },
                {
                  "type": "element",
                  "master": "[vv,v](+)",
                  "x": 517,
                  "y": 190,
                  "state": "normal",
                  "id": 1224
                },
                {
                  "type": "element",
                  "elementType": "output",
                  "x": 577,
                  "y": 214,
                  "master": "[v(+1),]",
                  "pinIndex": 0,
                  "id": 1225
                },
                {
                  "type": "element",
                  "elementType": "input",
                  "x": 460,
                  "y": 172,
                  "master": "[,v]",
                  "pinIndex": 0,
                  "id": 1226
                },
                {
                  "type": "wire",
                  "srcId": 1223,
                  "srcPin": 0,
                  "dstId": 1224,
                  "dstPin": 1,
                  "id": 1227
                },
                {
                  "type": "wire",
                  "srcId": 1226,
                  "srcPin": 0,
                  "dstId": 1224,
                  "dstPin": 0,
                  "id": 1228
                },
                {
                  "type": "wire",
                  "srcId": 1224,
                  "srcPin": 0,
                  "dstId": 1225,
                  "dstPin": 0,
                  "id": 1229
                }
              ],
              "master": "[v,v(+1)]",
              "state": "normal",
              "id": 1230
            },
            {
              "type": "element",
              "x": 524,
              "y": 161.75,
              "master": "[v(i),v](@)",
              "id": 1231
            },
            {
              "type": "wire",
              "srcId": 1222,
              "srcPin": 0,
              "dstId": 1220,
              "dstPin": 0,
              "id": 1232
            },
            {
              "type": "wire",
              "srcId": 1221,
              "srcPin": 0,
              "dstId": 1220,
              "dstPin": 1,
              "id": 1233
            },
            {
              "type": "wire",
              "srcId": 1220,
              "srcPin": 0,
              "dstId": 1217,
              "dstPin": 0,
              "id": 1234
            },
            {
              "type": "wire",
              "srcId": 1219,
              "srcPin": 0,
              "dstId": 1217,
              "dstPin": 2,
              "id": 1235
            },
            {
              "type": "wire",
              "srcId": 1217,
              "srcPin": 0,
              "dstId": 1218,
              "dstPin": 0,
              "id": 1236
            },
            {
              "type": "wire",
              "srcId": 1222,
              "srcPin": 0,
              "dstId": 1216,
              "dstPin": 0,
              "id": 1237
            },
            {
              "type": "wire",
              "srcId": 1216,
              "srcPin": 0,
              "dstId": 1217,
              "dstPin": 1,
              "id": 1238
            },
            {
              "type": "wire",
              "srcId": 1222,
              "srcPin": 0,
              "dstId": 1230,
              "dstPin": 0,
              "id": 1239
            },
            {
              "type": "wire",
              "srcId": 1231,
              "srcPin": 0,
              "dstId": 1216,
              "dstPin": 1,
              "id": 1240
            },
            {
              "type": "wire",
              "srcId": 1230,
              "srcPin": 0,
              "dstId": 1231,
              "dstPin": 0,
              "id": 1241
            },
            {
              "type": "wire",
              "srcId": 1214,
              "srcPin": 0,
              "dstId": 1216,
              "dstPin": 2,
              "id": 1242
            }
          ],
          "master": "[v(i)v(n)v(f0)[vv,v](f),v]",
          "state": "normal",
          "id": 1243
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v(1)]",
          "x": 615,
          "y": 116,
          "state": "normal",
          "id": 1244
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v(1)]",
          "x": 617,
          "y": 171,
          "state": "normal",
          "id": 1245
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](*)",
            "x": 643,
            "y": 187,
            "state": "normal",
            "id": 1246
          },
          "elementType": "closed",
          "x": 603,
          "y": 207,
          "master": "[,[vv,v](*)]",
          "state": "normal",
          "id": 1247
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 554,
          "y": 143.1,
          "master": "[,v(n)]",
          "state": "normal",
          "id": 1248,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 1247,
          "srcPin": 0,
          "dstId": 1243,
          "dstPin": 3,
          "id": 1249
        },
        {
          "type": "wire",
          "srcId": 1245,
          "srcPin": 0,
          "dstId": 1243,
          "dstPin": 2,
          "id": 1250
        },
        {
          "type": "wire",
          "srcId": 1244,
          "srcPin": 0,
          "dstId": 1243,
          "dstPin": 0,
          "id": 1251
        },
        {
          "type": "wire",
          "srcId": 1243,
          "srcPin": 0,
          "dstId": 1213,
          "dstPin": 0,
          "id": 1252
        },
        {
          "type": "wire",
          "srcId": 1248,
          "srcPin": 0,
          "dstId": 1243,
          "dstPin": 1,
          "id": 1253
        }
      ],
      "master": "[v(n),v(n!)]"
    },
    {
      "type": "element",
      "master": "[v(n),v(n)[v,v][vv,v]]([])",
      "x": 1191,
      "y": 51,
      "state": "normal",
      "id": 1256
    },
    {
      "type": "element",
      "x": 1693,
      "y": 120.60000000000002,
      "groupItems": [
        {
          "type": "element",
          "elementType": "input",
          "x": 443,
          "y": 220.4,
          "master": "[,[vv,v](f)]",
          "pinIndex": 3,
          "id": 1257
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 553,
            "y": 107,
            "state": "normal",
            "id": 1258
          },
          "elementType": "opened",
          "x": 598,
          "y": 141,
          "master": "[vv[vv,v],v]",
          "id": 1259
        },
        {
          "type": "element",
          "master": "[vvv,v](?)",
          "x": 612,
          "y": 40,
          "state": "normal",
          "id": 1260
        },
        {
          "type": "element",
          "elementType": "output",
          "master": "[v,]",
          "x": 699,
          "y": 49,
          "state": "normal",
          "pinIndex": 0,
          "id": 1261
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(f0)]",
          "x": 371,
          "y": 123,
          "state": "normal",
          "pinIndex": 2,
          "id": 1262
        },
        {
          "type": "element",
          "master": "[vv,v](<)",
          "x": 554,
          "y": 30,
          "state": "normal",
          "id": 1263
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(n)]",
          "x": 372,
          "y": 85,
          "state": "normal",
          "pinIndex": 1,
          "id": 1264
        },
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(i)]",
          "x": 371,
          "y": 38,
          "state": "normal",
          "pinIndex": 0,
          "id": 1265
        },
        {
          "type": "element",
          "x": 456.9013671875,
          "y": 156.5,
          "groupItems": [
            {
              "type": "element",
              "elementType": "literal",
              "master": "[,v(1)]",
              "x": 463,
              "y": 218,
              "state": "normal",
              "id": 1266
            },
            {
              "type": "element",
              "master": "[vv,v](+)",
              "x": 517,
              "y": 190,
              "state": "normal",
              "id": 1267
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 577,
              "y": 214,
              "master": "[v(+1),]",
              "pinIndex": 0,
              "id": 1268
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 460,
              "y": 172,
              "master": "[,v]",
              "pinIndex": 0,
              "id": 1269
            },
            {
              "type": "wire",
              "srcId": 1266,
              "srcPin": 0,
              "dstId": 1267,
              "dstPin": 1,
              "id": 1270
            },
            {
              "type": "wire",
              "srcId": 1269,
              "srcPin": 0,
              "dstId": 1267,
              "dstPin": 0,
              "id": 1271
            },
            {
              "type": "wire",
              "srcId": 1267,
              "srcPin": 0,
              "dstId": 1268,
              "dstPin": 0,
              "id": 1272
            }
          ],
          "master": "[v,v(+1)]",
          "state": "normal",
          "id": 1273
        },
        {
          "type": "element",
          "x": 524,
          "y": 161.75,
          "master": "[v(i),v](@)",
          "id": 1274
        },
        {
          "type": "wire",
          "srcId": 1265,
          "srcPin": 0,
          "dstId": 1263,
          "dstPin": 0,
          "id": 1275
        },
        {
          "type": "wire",
          "srcId": 1264,
          "srcPin": 0,
          "dstId": 1263,
          "dstPin": 1,
          "id": 1276
        },
        {
          "type": "wire",
          "srcId": 1263,
          "srcPin": 0,
          "dstId": 1260,
          "dstPin": 0,
          "id": 1277
        },
        {
          "type": "wire",
          "srcId": 1262,
          "srcPin": 0,
          "dstId": 1260,
          "dstPin": 2,
          "id": 1278
        },
        {
          "type": "wire",
          "srcId": 1260,
          "srcPin": 0,
          "dstId": 1261,
          "dstPin": 0,
          "id": 1279
        },
        {
          "type": "wire",
          "srcId": 1265,
          "srcPin": 0,
          "dstId": 1259,
          "dstPin": 0,
          "id": 1280
        },
        {
          "type": "wire",
          "srcId": 1259,
          "srcPin": 0,
          "dstId": 1260,
          "dstPin": 1,
          "id": 1281
        },
        {
          "type": "wire",
          "srcId": 1265,
          "srcPin": 0,
          "dstId": 1273,
          "dstPin": 0,
          "id": 1282
        },
        {
          "type": "wire",
          "srcId": 1274,
          "srcPin": 0,
          "dstId": 1259,
          "dstPin": 1,
          "id": 1283
        },
        {
          "type": "wire",
          "srcId": 1273,
          "srcPin": 0,
          "dstId": 1274,
          "dstPin": 0,
          "id": 1284
        },
        {
          "type": "wire",
          "srcId": 1257,
          "srcPin": 0,
          "dstId": 1259,
          "dstPin": 2,
          "id": 1285
        }
      ],
      "master": "[v(i)v(n)v(f0)[vv,v](f),v]",
      "id": 1286,
      "state": "normal"
    },
    {
      "type": "element",
      "elementType": "apply",
      "master": "[v*,v]",
      "x": 1332,
      "y": 102,
      "state": "normal",
      "id": 1287
    },
    {
      "type": "wire",
      "srcId": 1256,
      "srcPin": 1,
      "dstId": 1287,
      "dstPin": 1,
      "id": 1288
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 1299,
      "y": 76,
      "master": "[,v]",
      "id": 1289
    },
    {
      "type": "wire",
      "srcId": 1289,
      "srcPin": 0,
      "dstId": 1287,
      "dstPin": 0,
      "id": 1290
    },
    {
      "type": "element",
      "master": "[vv,v](+)",
      "x": 1384,
      "y": 113,
      "state": "normal",
      "id": 1293
    },
    {
      "type": "wire",
      "srcId": 1287,
      "srcPin": 0,
      "dstId": 1293,
      "dstPin": 0,
      "id": 1294
    },
    {
      "type": "element",
      "elementType": "input",
      "x": 1352,
      "y": 148,
      "master": "[,v]",
      "id": 1295
    },
    {
      "type": "wire",
      "srcId": 1295,
      "srcPin": 0,
      "dstId": 1293,
      "dstPin": 1,
      "id": 1296
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 1444,
      "y": 137,
      "master": "[v,]",
      "id": 1297
    },
    {
      "type": "wire",
      "srcId": 1293,
      "srcPin": 0,
      "dstId": 1297,
      "dstPin": 0,
      "id": 1298
    },
    {
      "type": "element",
      "master": "[v(n),v(n)[v,v][vv,v]]([])",
      "x": 1194,
      "y": 167,
      "state": "normal",
      "id": 1315
    },
    {
      "type": "wire",
      "srcId": 1315,
      "srcPin": 1,
      "dstId": 1330,
      "dstPin": 0,
      "id": 1320,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "element": {
        "type": "element",
        "x": 524,
        "y": 217.5,
        "id": 1327,
        "groupItems": [
          {
            "type": "element",
            "elementType": "input",
            "x": 442,
            "y": 192,
            "master": "[,v]",
            "state": "normal",
            "id": 1311,
            "pinIndex": 1
          },
          {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 526,
            "y": 224,
            "state": "normal",
            "id": 1313
          },
          {
            "type": "element",
            "elementType": "output",
            "x": 586,
            "y": 248,
            "master": "[v,]",
            "state": "normal",
            "id": 1312,
            "pinIndex": 0
          },
          {
            "type": "element",
            "elementType": "apply",
            "master": "[v*,v]",
            "x": 474,
            "y": 213,
            "state": "normal",
            "id": 1314
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 443,
            "y": 167,
            "master": "[,v]",
            "state": "normal",
            "id": 1310,
            "pinIndex": 0
          },
          {
            "type": "wire",
            "srcId": 1313,
            "srcPin": 0,
            "dstId": 1312,
            "dstPin": 0,
            "id": 1316,
            "x": null,
            "y": null
          },
          {
            "type": "wire",
            "srcId": 1311,
            "srcPin": 0,
            "dstId": 1313,
            "dstPin": 1,
            "id": 1317,
            "x": null,
            "y": null
          },
          {
            "type": "wire",
            "srcId": 1314,
            "srcPin": 0,
            "dstId": 1313,
            "dstPin": 0,
            "id": 1318,
            "x": null,
            "y": null
          },
          {
            "type": "wire",
            "srcId": 1310,
            "srcPin": 0,
            "dstId": 1314,
            "dstPin": 0,
            "id": 1319,
            "x": null,
            "y": null
          },
          {
            "type": "element",
            "elementType": "input",
            "x": 442,
            "y": 237,
            "master": "[,*]",
            "id": 1328,
            "pinIndex": 2
          },
          {
            "type": "wire",
            "srcId": 1328,
            "srcPin": 0,
            "dstId": 1314,
            "dstPin": 1,
            "id": 1329
          }
        ],
        "master": "[vv[v,v],v]"
      },
      "elementType": "closed",
      "x": 1603,
      "y": 207.5,
      "id": 1330,
      "master": "[[v,v],[vv,v]]"
    },
    {
      "type": "wire",
      "srcId": 1330,
      "srcPin": 0,
      "dstId": 1286,
      "dstPin": 3,
      "id": 1331
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(0)]",
      "x": 1624,
      "y": 161,
      "state": "normal",
      "id": 1332
    },
    {
      "type": "wire",
      "srcId": 1332,
      "srcPin": 0,
      "dstId": 1286,
      "dstPin": 2,
      "id": 1333
    },
    {
      "type": "wire",
      "srcId": 1315,
      "srcPin": 0,
      "dstId": 1286,
      "dstPin": 1,
      "id": 1334
    },
    {
      "type": "element",
      "elementType": "literal",
      "master": "[,v(0)]",
      "x": 1621,
      "y": 112,
      "state": "normal",
      "id": 1335
    },
    {
      "type": "wire",
      "srcId": 1335,
      "srcPin": 0,
      "dstId": 1286,
      "dstPin": 0,
      "id": 1336
    },
    {
      "type": "element",
      "elementType": "output",
      "x": 1779.8013671875,
      "y": 120.60000000000002,
      "master": "[v,]",
      "id": 1337
    },
    {
      "type": "wire",
      "srcId": 1286,
      "srcPin": 0,
      "dstId": 1337,
      "dstPin": 0,
      "id": 1338
    },
    {
      "type": "element",
      "x": 553.00341796875,
      "y": 378.5,
      "id": 1409,
      "groupItems": [
        {
          "type": "element",
          "elementType": "input",
          "master": "[,v(node)]",
          "x": 344,
          "y": 66,
          "state": "normal",
          "id": 1364,
          "pinIndex": 0
        },
        {
          "type": "element",
          "master": "[v,v[v,v][vv,v]]({})",
          "x": 417,
          "y": 120,
          "state": "normal",
          "id": 1370
        },
        {
          "type": "element",
          "elementType": "apply",
          "master": "[v*,v]",
          "x": 568,
          "y": 181,
          "state": "normal",
          "id": 1374
        },
        {
          "type": "element",
          "x": 606,
          "y": 154.5,
          "master": "[v(node),v](@)",
          "id": 1399,
          "state": "normal"
        },
        {
          "type": "element",
          "x": 684.10205078125,
          "y": 140,
          "id": 1393,
          "groupItems": [
            {
              "type": "element",
              "master": "[vvv,v](?)",
              "x": 772,
              "y": 166,
              "state": "normal",
              "id": 1389
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 651,
              "y": 205,
              "master": "[,v]",
              "id": 1385,
              "pinIndex": 1
            },
            {
              "type": "element",
              "master": "[vv,v](<)",
              "x": 728,
              "y": 159,
              "state": "normal",
              "id": 1382
            },
            {
              "type": "element",
              "elementType": "input",
              "x": 650,
              "y": 179,
              "master": "[,v]",
              "id": 1383,
              "pinIndex": 0
            },
            {
              "type": "element",
              "elementType": "output",
              "x": 837,
              "y": 176,
              "master": "[v(max),]",
              "id": 1387,
              "pinIndex": 0
            },
            {
              "type": "wire",
              "srcId": 1383,
              "srcPin": 0,
              "dstId": 1382,
              "dstPin": 0,
              "id": 1384
            },
            {
              "type": "wire",
              "srcId": 1385,
              "srcPin": 0,
              "dstId": 1382,
              "dstPin": 1,
              "id": 1386
            },
            {
              "type": "wire",
              "srcId": 1389,
              "srcPin": 0,
              "dstId": 1387,
              "dstPin": 0,
              "id": 1388
            },
            {
              "type": "wire",
              "srcId": 1382,
              "srcPin": 0,
              "dstId": 1389,
              "dstPin": 0,
              "id": 1390
            },
            {
              "type": "wire",
              "dstId": 1389,
              "dstPin": 1,
              "srcId": 1383,
              "srcPin": 0,
              "id": 1391
            },
            {
              "type": "wire",
              "srcId": 1385,
              "srcPin": 0,
              "dstId": 1389,
              "dstPin": 2,
              "id": 1392
            }
          ],
          "master": "[vv,v(max)]"
        },
        {
          "type": "element",
          "master": "[vvv,v](?)",
          "x": 788,
          "y": 44,
          "state": "normal",
          "id": 1367
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v(0)]",
          "x": 725,
          "y": 83,
          "state": "normal",
          "id": 1366
        },
        {
          "type": "element",
          "master": "[v,v](!)",
          "x": 451,
          "y": 41,
          "state": "normal",
          "id": 1363
        },
        {
          "type": "element",
          "x": 604,
          "y": 108.5,
          "id": 1396,
          "master": "[v(node),v](@)"
        },
        {
          "type": "element",
          "elementType": "apply",
          "master": "[v*,v]",
          "x": 557,
          "y": 111,
          "state": "normal",
          "id": 1372
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v('left')]",
          "x": 472,
          "y": 89,
          "state": "normal",
          "id": 1403
        },
        {
          "type": "element",
          "elementType": "literal",
          "master": "[,v('right')]",
          "x": 485,
          "y": 156,
          "state": "normal",
          "id": 1406
        },
        {
          "type": "element",
          "elementType": "output",
          "master": "[v(depth),]",
          "x": 856,
          "y": 56,
          "state": "normal",
          "id": 1380,
          "pinIndex": 0
        },
        {
          "type": "wire",
          "srcId": 1364,
          "srcPin": 0,
          "dstId": 1363,
          "dstPin": 0,
          "id": 1365
        },
        {
          "type": "wire",
          "srcId": 1366,
          "srcPin": 0,
          "dstId": 1367,
          "dstPin": 1,
          "id": 1368
        },
        {
          "type": "wire",
          "srcId": 1363,
          "srcPin": 0,
          "dstId": 1367,
          "dstPin": 0,
          "id": 1369
        },
        {
          "type": "wire",
          "srcId": 1364,
          "srcPin": 0,
          "dstId": 1370,
          "dstPin": 0,
          "id": 1371
        },
        {
          "type": "wire",
          "srcId": 1370,
          "srcPin": 1,
          "dstId": 1372,
          "dstPin": 1,
          "id": 1373
        },
        {
          "type": "wire",
          "srcId": 1370,
          "srcPin": 1,
          "dstId": 1374,
          "dstPin": 1,
          "id": 1375
        },
        {
          "type": "wire",
          "srcId": 1367,
          "srcPin": 0,
          "dstId": 1380,
          "dstPin": 0,
          "id": 1381
        },
        {
          "type": "wire",
          "srcId": 1393,
          "srcPin": 0,
          "dstId": 1367,
          "dstPin": 2,
          "id": 1394
        },
        {
          "type": "wire",
          "srcId": 1372,
          "srcPin": 0,
          "dstId": 1396,
          "dstPin": 0,
          "id": 1397
        },
        {
          "type": "wire",
          "srcId": 1396,
          "srcPin": 0,
          "dstId": 1393,
          "dstPin": 0,
          "id": 1398
        },
        {
          "type": "wire",
          "srcId": 1374,
          "srcPin": 0,
          "dstId": 1399,
          "dstPin": 0,
          "id": 1400
        },
        {
          "type": "wire",
          "srcId": 1399,
          "srcPin": 0,
          "dstId": 1393,
          "dstPin": 1,
          "id": 1401
        },
        {
          "type": "wire",
          "srcId": 1403,
          "srcPin": 0,
          "dstId": 1372,
          "dstPin": 0,
          "id": 1404
        },
        {
          "type": "wire",
          "srcId": 1406,
          "srcPin": 0,
          "dstId": 1374,
          "dstPin": 0,
          "id": 1407
        }
      ],
      "master": "[v(node),v(depth)]"
    },
    {
      "type": "element",
      "x": 908.5142628146091,
      "y": 109.63031430377413,
      "id": 1507,
      "groupItems": [
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 684,
            "y": 128,
            "state": "normal",
            "id": 1485
          },
          "elementType": "opened",
          "x": 806.8007851535311,
          "y": 178.1258798198387,
          "master": "[vv[vv,v],v]",
          "state": "normal",
          "id": 1486
        },
        {
          "type": "element",
          "elementType": "output",
          "x": 878.8007851535311,
          "y": 178.1258798198387,
          "master": "[v,]",
          "pinIndex": 0,
          "state": "normal",
          "id": 1487
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 620.2926432694342,
          "y": 242.54620549520257,
          "master": "[,[vv,v](op)]",
          "state": "normal",
          "id": 1488,
          "pinIndex": 4
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 635,
            "y": 163,
            "state": "normal",
            "id": 1489
          },
          "elementType": "opened",
          "x": 722.8007851535311,
          "y": 172.1258798198387,
          "master": "[vv[vv,v],v]",
          "state": "normal",
          "id": 1490
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 655.8007851535311,
          "y": 207.1258798198387,
          "master": "[,v]",
          "pinIndex": 3,
          "state": "normal",
          "id": 1491
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 656.8007851535311,
          "y": 171.1258798198387,
          "master": "[,v]",
          "pinIndex": 2,
          "state": "normal",
          "id": 1492
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 657.8007851535311,
          "y": 137.1258798198387,
          "master": "[,v]",
          "pinIndex": 1,
          "state": "normal",
          "id": 1493
        },
        {
          "type": "element",
          "elementType": "input",
          "x": 656.8007851535311,
          "y": 101.1258798198387,
          "master": "[,v]",
          "pinIndex": 0,
          "state": "normal",
          "id": 1494
        },
        {
          "type": "element",
          "element": {
            "type": "element",
            "master": "[vv,v](+)",
            "x": 634,
            "y": 102,
            "state": "normal",
            "id": 1495
          },
          "elementType": "opened",
          "x": 725.8007851535311,
          "y": 102.1258798198387,
          "master": "[vv[vv,v],v]",
          "state": "normal",
          "id": 1496
        },
        {
          "type": "wire",
          "srcId": 1488,
          "srcPin": 0,
          "dstId": 1486,
          "dstPin": 2,
          "id": 1497
        },
        {
          "type": "wire",
          "srcId": 1488,
          "srcPin": 0,
          "dstId": 1496,
          "dstPin": 2,
          "id": 1498
        },
        {
          "type": "wire",
          "srcId": 1488,
          "srcPin": 0,
          "dstId": 1490,
          "dstPin": 2,
          "id": 1499
        },
        {
          "type": "wire",
          "srcId": 1496,
          "srcPin": 0,
          "dstId": 1486,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1500
        },
        {
          "type": "wire",
          "srcId": 1490,
          "srcPin": 0,
          "dstId": 1486,
          "dstPin": 1,
          "x": null,
          "y": null,
          "id": 1501
        },
        {
          "type": "wire",
          "srcId": 1492,
          "srcPin": 0,
          "dstId": 1490,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1502
        },
        {
          "type": "wire",
          "srcId": 1491,
          "srcPin": 0,
          "dstId": 1490,
          "dstPin": 1,
          "x": null,
          "y": null,
          "id": 1503
        },
        {
          "type": "wire",
          "srcId": 1494,
          "srcPin": 0,
          "dstId": 1496,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1504
        },
        {
          "type": "wire",
          "srcId": 1493,
          "srcPin": 0,
          "dstId": 1496,
          "dstPin": 1,
          "x": null,
          "y": null,
          "id": 1505
        },
        {
          "type": "wire",
          "srcId": 1486,
          "srcPin": 0,
          "dstId": 1487,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1506
        }
      ],
      "master": "[vvvv[vv,v](op),v]"
    }
  ]
}