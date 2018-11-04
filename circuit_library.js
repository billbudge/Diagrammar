let factorial_and_fibonacci =
{
  "type": "diagram",
  "id": 1001,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430.60454734008107,
  "name": "Example",
  "items": [
    {
      "type": "element",
      "master": "!",
      "x": 160,
      "y": 320,
      "id": 1002
    },
    {
      "type": "element",
      "master": "~",
      "x": 208,
      "y": 320,
      "id": 1003
    },
    {
      "type": "element",
      "master": "-",
      "x": 256,
      "y": 320,
      "id": 1004
    },
    {
      "type": "element",
      "master": "+",
      "x": 304,
      "y": 320,
      "id": 1005
    },
    {
      "type": "element",
      "master": "*",
      "x": 352,
      "y": 320,
      "id": 1006
    },
    {
      "type": "element",
      "master": "/",
      "x": 400,
      "y": 320,
      "id": 1007
    },
    {
      "type": "element",
      "master": "%",
      "x": 448,
      "y": 320,
      "id": 1008
    },
    {
      "type": "element",
      "master": "==",
      "x": 496,
      "y": 320,
      "id": 1009
    },
    {
      "type": "element",
      "master": "!=",
      "x": 544,
      "y": 320,
      "id": 1010
    },
    {
      "type": "element",
      "master": "<",
      "x": 592,
      "y": 320,
      "id": 1011
    },
    {
      "type": "element",
      "master": "<=",
      "x": 640,
      "y": 320,
      "id": 1012
    },
    {
      "type": "element",
      "master": ">",
      "x": 688,
      "y": 320,
      "id": 1013
    },
    {
      "type": "element",
      "master": ">=",
      "x": 736,
      "y": 320,
      "id": 1014
    },
    {
      "type": "element",
      "master": "|",
      "x": 784,
      "y": 320,
      "id": 1015
    },
    {
      "type": "element",
      "master": "&",
      "x": 832,
      "y": 320,
      "id": 1016
    },
    {
      "type": "element",
      "master": "||",
      "x": 880,
      "y": 320,
      "id": 1017
    },
    {
      "type": "element",
      "master": "&&",
      "x": 928,
      "y": 320,
      "id": 1018
    },
    {
      "type": "element",
      "master": "?",
      "x": 976,
      "y": 320,
      "id": 1019
    },
    {
      "type": "element",
      "master": "$",
      "x": 259,
      "y": 266,
      "inputs": [
        {
          "type": "v"
        }
      ],
      "outputs": [
        {
          "type": "v"
        }
      ],
      "groupItems": [
        {
          "type": "wire",
          "srcId": 1043,
          "srcPin": 0,
          "dstId": 1029,
          "dstPin": 1,
          "id": 1044,
          "x": null,
          "y": null
        },
        {
          "type": "wire",
          "srcId": 1029,
          "srcPin": 0,
          "dstId": 1038,
          "dstPin": 0,
          "id": 1039,
          "x": null,
          "y": null
        },
        {
          "type": "wire",
          "srcId": 1033,
          "srcPin": 0,
          "dstId": 1029,
          "dstPin": 0,
          "id": 1034,
          "x": null,
          "y": null
        },
        {
          "type": "element",
          "x": 253,
          "y": 79,
          "master": "$",
          "name": "1",
          "inputs": [],
          "outputs": [
            {
              "type": "v",
              "id": 1032
            }
          ],
          "id": 1033
        },
        {
          "type": "element",
          "x": 260,
          "y": 123,
          "master": "$",
          "junction": "input",
          "inputs": [],
          "outputs": [
            {
              "type": "v"
            }
          ],
          "id": 1043
        },
        {
          "type": "element",
          "x": 310,
          "y": 84,
          "master": "+",
          "id": 1029
        },
        {
          "type": "element",
          "x": 377,
          "y": 91,
          "master": "$",
          "junction": "output",
          "inputs": [
            {
              "type": "v"
            }
          ],
          "outputs": [],
          "id": 1038
        }
      ],
      "id": 1045,
      "name": "+1"
    },
    {
      "type": "element",
      "master": "$",
      "x": 191,
      "y": 179,
      "inputs": [
        {
          "type": "v",
          "id": 1059
        }
      ],
      "outputs": [
        {
          "type": "v",
          "id": 1060
        }
      ],
      "groupItems": [
        {
          "type": "wire",
          "srcId": 1067,
          "srcPin": 0,
          "dstId": 1068,
          "dstPin": 1,
          "x": null,
          "y": null,
          "id": 1061
        },
        {
          "type": "wire",
          "srcId": 1068,
          "srcPin": 0,
          "dstId": 1070,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1062
        },
        {
          "type": "wire",
          "srcId": 1065,
          "srcPin": 0,
          "dstId": 1068,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1063
        },
        {
          "type": "element",
          "x": 253,
          "y": 79,
          "master": "$",
          "name": "1",
          "inputs": [],
          "outputs": [
            {
              "type": "v",
              "id": 1064
            }
          ],
          "id": 1065
        },
        {
          "type": "element",
          "x": 260,
          "y": 123,
          "master": "$",
          "junction": "input",
          "inputs": [],
          "outputs": [
            {
              "type": "v",
              "id": 1066
            }
          ],
          "id": 1067
        },
        {
          "type": "element",
          "x": 310,
          "y": 84,
          "master": "+",
          "id": 1068
        },
        {
          "type": "element",
          "x": 377,
          "y": 91,
          "master": "$",
          "junction": "output",
          "inputs": [
            {
              "type": "v",
              "id": 1069
            }
          ],
          "outputs": [],
          "id": 1070
        }
      ],
      "name": "-1",
      "id": 1071
    },
    {
      "type": "element",
      "x": 347,
      "y": 80,
      "master": "?",
      "id": 1073
    },
    {
      "type": "element",
      "x": 232,
      "y": 105,
      "master": "$",
      "name": "1",
      "inputs": [],
      "outputs": [
        {
          "type": "v",
          "id": 1076
        }
      ],
      "id": 1077
    },
    {
      "type": "element",
      "master": "<=",
      "x": 275,
      "y": 60,
      "id": 1083
    },
    {
      "type": "wire",
      "srcId": 1083,
      "srcPin": 0,
      "dstId": 1073,
      "dstPin": 0,
      "id": 1084,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 1077,
      "srcPin": 0,
      "dstId": 1083,
      "dstPin": 1,
      "id": 1085,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 1077,
      "srcPin": 0,
      "dstId": 1073,
      "dstPin": 1,
      "id": 1086,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "x": 157,
      "y": 92,
      "master": "$",
      "junction": "input",
      "inputs": [],
      "outputs": [
        {
          "type": "v"
        }
      ],
      "id": 1090,
      "name": "i"
    },
    {
      "type": "wire",
      "srcId": 1090,
      "srcPin": 0,
      "dstId": 1083,
      "dstPin": 0,
      "id": 1091,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "x": 413,
      "y": 91,
      "master": "$",
      "junction": "output",
      "inputs": [
        {
          "type": "v"
        }
      ],
      "outputs": [],
      "id": 1095
    },
    {
      "type": "wire",
      "srcId": 1073,
      "srcPin": 0,
      "dstId": 1095,
      "dstPin": 0,
      "id": 1096,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "master": "$",
      "x": 238,
      "y": 178,
      "inputs": [
        {
          "type": "v",
          "name": "i"
        }
      ],
      "outputs": [
        {
          "type": "v"
        }
      ],
      "id": 1097,
      "name": "fac"
    },
    {
      "type": "element",
      "master": "*",
      "x": 289,
      "y": 144,
      "id": 1100
    },
    {
      "type": "wire",
      "srcId": 1100,
      "srcPin": 0,
      "dstId": 1073,
      "dstPin": 2,
      "id": 1101,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 1090,
      "srcPin": 0,
      "dstId": 1100,
      "dstPin": 0,
      "id": 1102,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 1097,
      "srcPin": 0,
      "dstId": 1100,
      "dstPin": 1,
      "id": 1103,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "srcId": 1090,
      "srcPin": 0,
      "dstId": 1071,
      "dstPin": 0,
      "id": 1104,
      "x": null,
      "y": null
    },
    {
      "type": "wire",
      "dstId": 1097,
      "dstPin": 0,
      "srcId": 1071,
      "srcPin": 0,
      "id": 1106,
      "x": null,
      "y": null
    },
    {
      "type": "element",
      "master": "$",
      "x": 206,
      "y": 265,
      "inputs": [
        {
          "type": "v",
          "id": 1120
        }
      ],
      "outputs": [
        {
          "type": "v",
          "id": 1121
        }
      ],
      "groupItems": [
        {
          "type": "wire",
          "srcId": 1128,
          "srcPin": 0,
          "dstId": 1129,
          "dstPin": 1,
          "x": null,
          "y": null,
          "id": 1122
        },
        {
          "type": "wire",
          "srcId": 1129,
          "srcPin": 0,
          "dstId": 1131,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1123
        },
        {
          "type": "wire",
          "srcId": 1126,
          "srcPin": 0,
          "dstId": 1129,
          "dstPin": 0,
          "x": null,
          "y": null,
          "id": 1124
        },
        {
          "type": "element",
          "x": 253,
          "y": 79,
          "master": "$",
          "name": "1",
          "inputs": [],
          "outputs": [
            {
              "type": "v",
              "id": 1125
            }
          ],
          "id": 1126
        },
        {
          "type": "element",
          "x": 260,
          "y": 123,
          "master": "$",
          "junction": "input",
          "inputs": [],
          "outputs": [
            {
              "type": "v",
              "id": 1127
            }
          ],
          "id": 1128
        },
        {
          "type": "element",
          "x": 310,
          "y": 84,
          "master": "+",
          "id": 1129
        },
        {
          "type": "element",
          "x": 377,
          "y": 91,
          "master": "$",
          "junction": "output",
          "inputs": [
            {
              "type": "v",
              "id": 1130
            }
          ],
          "outputs": [],
          "id": 1131
        }
      ],
      "name": "-1",
      "id": 1132
    }
  ]
}