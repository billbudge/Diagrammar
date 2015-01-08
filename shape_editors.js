// // Pinball shapes module.

// 'use strict';

// var shapeEditors = (function() {

//   // Utilities.

//   function visit(item, itemFn) {
//     itemFn(item);
//     var items = item.items;
//     if (items) {
//       var length = items.length;
//       for (var i = 0; i < length; i++)
//         visit(items[i], itemFn);
//     }
//   }

//   function reverseVisit(item, itemFn) {
//     var items = item.items;
//     if (items) {
//       var length = items.length;
//       for (var i = length - 1; i >= 0; i--)
//         reverseVisit(items[i], itemFn);
//     }
//     itemFn(item);
//   }

//   function isPaletteItem(item) {
//     return item._palette;
//   }

// //------------------------------------------------------------------------------

//   var editingContext = (function() {
//     var functions = {
//       reduceSelection: function() {
//         var model = this.model;
//         model.hierarchicalModel.reduceSelection(model.selectionModel);
//       },

//       deleteItem: function(item) {
//         var model = this.model,
//             parent = model.hierarchicalModel.getParent(item);
//         if (parent) {
//           var items = parent.items;
//           var length = items.length;
//           for (var i = 0; i < length; i++) {
//             var subItem = items[i];
//             if (subItem === item) {
//               model.observableModel.removeElement(parent, items, i);
//               break;
//             }
//           }
//         }
//       },

//       deleteItems: function(items) {
//         var self = this;
//         items.forEach(function(item) {
//           self.deleteItem(item);
//         })
//       },

//       doDelete: function() {
//         this.reduceSelection();
//         this.prototype.doDelete.call(this);
//       },

//       copyItems: function(items, map) {
//         var self = this,
//             copies = this.prototype.copyItems(items, map);

//         items.forEach(function(item) {
//           var copy = map.find(self.model.dataModel.getId(item));
//           // if (isState(copy)) {
//           //   var wp = self.renderer.getPosition(item);
//           //   copy.x = wp.x;
//           //   copy.y = wp.y;
//           // }
//         });
//         return copies;
//       },

//       doCopy: function() {
//         var selectionModel = this.model.selectionModel;
//         this.reduceSelection();
//         selectionModel.contents().forEach(function(item) {
//           // if (!isState(item))
//           //   selectionModel.remove(item);
//         });
//         this.prototype.doCopy.call(this);
//       },

//     // addPaletteItem: function(item) {
//     //   clearSelection();
//     //   // Clone palette item and add the clone to the top level group. Don't
//     //   // notify observers yet.
//     //   item = model.instancingModel.clone(item);
//     //   board.items.push(item);
//     //   hierarchicalModel.init(item, board);
//     //   select(item);
//     //   addingNewItem = true;
//     // }

//     // function addItemToParent(item, parent) {
//     //   var oldParent = hierarchicalModel.getParent(item);

//     //   if (parent === board) {
//     //     var shape = {
//     //       type: 'group',
//     //       op: 'hull',
//     //       x: item.x,
//     //       y: -item.y,
//     //       items: [],
//     //     };
//     //     dataModel.assignId(shape);
//     //     shape.items.push(item);
//     //     item.x = 0;
//     //     item.y = 0;
//     //     item = shape;
//     //   }
//     //   VecMat(item, oldParent._atransform);
//     //   VecMat(item, parent._aitransform);

//     //   // if (item.type == 'bezier') {
//     //   //   item._parent = parent;
//     //   //   autoRotateBezier(item);
//     //   // }

//     //   oldParent.items.pop();  // remove from temporary position.
//     //   parent.items.push(item);
//     //   observableModel.onElementInserted(parent, parent.items, parent.items.length - 1);
//     // },


//       addItems: function(items) {
//         var model = this.model, table = this.table,
//             tableItems = table.items;
//         items.forEach(function(item) {
//           table.items.push(item);
//           model.selectionModel.add(item);
//           model.observableModel.onElementInserted(table, tableItems, tableItems.length - 1);
//         });
//       },

//       doPaste: function() {
//         this.getScrap().forEach(function(item) {
//           // if (isState(item)) {
//           //   item.x += 16;
//           //   item.y += 16;
//           // }
//         });
//         this.prototype.doPaste.call(this);
//       },

//       // addTemporaryItem: function(item) {
//       //   var model = this.model,
//       //       statechart = this.statechart,
//       //       items = statechart.items;
//       //   model.observableModel.insertElement(statechart, items, items.length, item);
//       // },

//       // removeTemporaryItem: function() {
//       //   var model = this.model,
//       //       statechart = this.statechart,
//       //       items = statechart.items;
//       //   return model.observableModel.removeElement(statechart, items, items.length - 1);
//       // },

//       addItem: function(item, oldParent, parent) {
//         var model = this.model, renderer = this.renderer;
//         // if (oldParent !== parent && isState(item)) {
//         //   var itemWP = renderer.getPosition(item);
//         //   var parentWP = renderer.getPosition(parent);
//         //   item.x = itemWP.x - parentWP.x;
//         //   item.y = itemWP.y - parentWP.y;
//         // }

//         // var itemToAdd = item;
//         // if (parent.type != 'statechart') {
//         //   // States can't directly contain a state - add a new statechart if needed.
//         //   if (!parent.items)
//         //     parent.items = [];
//         //   if (!parent.items.length) {
//         //     var newStatechart = {
//         //       type: 'statechart',
//         //       x: 0,
//         //       y: 0,
//         //       width: 0,
//         //       height: 0,
//         //       name: '',
//         //       items: [ item ],
//         //     };
//         //     model.dataModel.assignId(newStatechart);
//         //     itemToAdd = newStatechart;
//         //   }
//         // }

//         // if (oldParent !== parent) {
//         //   if (oldParent)            // if null, it's a new item.
//         //     this.deleteItem(item);  // notifies observer
//         //   parent.items.push(itemToAdd);
//         //   model.observableModel.onElementInserted(parent, parent.items, parent.items.length - 1);
//         // }
//       },
//     }


//     function extend(model, renderer) {
//       dataModels.dataModel.extend(model);
//       dataModels.observableModel.extend(model);
//       dataModels.selectionModel.extend(model);
//       // dataModels.referencingModel.extend(model);
//       dataModels.hierarchicalModel.extend(model);
//       dataModels.transformableModel.extend(model);
//       dataModels.transactionModel.extend(model);
//       dataModels.transactionHistory.extend(model);
//       dataModels.instancingModel.extend(model);
//       dataModels.editingContext.extend(model);

//       var instance = Object.create(model.editingContext);
//       instance.prototype = Object.getPrototypeOf(instance);
//       for (var prop in functions)
//         instance[prop] = functions[prop];

//       instance.model = model;
//       instance.statechart = model.root;
//       instance.renderer = renderer;

//       model.editingContext = instance;
//       return instance;
//     }

//     return {
//       extend: extend,
//     }
//   })();

// //------------------------------------------------------------------------------

//   function Renderer(ctx, theme) {
//     this.ctx = ctx;

//     this.knobbySize = 4;

//     if (!theme)
//       theme = diagrams.theme.create();
//     this.theme = theme;
//     this.bgColor = theme.bgColor;
//     this.strokeColor = theme.strokeColor;

//     this.hitTolerance = 8;
//   }

//   // Renderer.prototype.beginDraw = function() {
//   //   var ctx = this.ctx;
//   //   ctx.save();
//   //   ctx.strokeStyle = this.strokeColor;
//   //   ctx.lineWidth = 1;
//   // }

//   // Renderer.prototype.endDraw = function() {
//   //   this.ctx.restore();
//   // }

//   Renderer.prototype.drawItem = function(item) {
//     var ctx = this.ctx, knobbySize = this.knobbySize, t = item._atransform;
//     ctx.save();
//     ctx.setTransform(t[0], t[2], t[1], t[3], t[4], t[5]); // local to world
//     switch (item.type) {
//       case 'disk':
//         // if (!isSelected(item._parent) && !item._parent._contentSelected && !isPaletteItem(item))
//         //   break;
//         ctx.beginPath();
//         ctx.arc(0, 0, item.radius, 0, 2 * Math.PI, false);
//         ctx.lineWidth = 0.5;
//         ctx.stroke();
//         ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//         break;
//       case 'bezier':
//         // if (!isSelected(item._parent) && !item._parent._contentSelected && !isPaletteItem(item))
//         //   break;
//         ctx.lineWidth = 0.5;
//         ctx.beginPath();
//         // Start at first point of first curve segment.
//         ctx.moveTo(item._curves[0][0].x, item._curves[0][0].y);
//         for (var i = 0; i < item._curves.length; i++) {
//           var seg = item._curves[i];
//           ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
//         }
//         ctx.stroke();
//         ctx.beginPath();
//         ctx.moveTo(-item.halfLength, 0);
//         ctx.lineTo(item.halfLength, 0);
//         ctx.setLineDash([5]);
//         ctx.stroke();
//         ctx.setLineDash([0]);
//         if (isSelected(item)) {
//           for (var i = 0; i < item.points.length; i++) {
//             var pi = item.points[i];
//             ctx.strokeRect(pi.x - knobbySize, pi.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
//           }
//           ctx.strokeRect(-item.halfLength - knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//           ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//           ctx.strokeRect(item.halfLength - knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//         }
//         break;
//       case 'group':
//         if (!item.op || !item._paths)
//           return;
//         // ctx.strokeRect(item._cx - knobbySize, item._cy - knobbySize, 2 * knobbySize, 2 * knobbySize);
//         for (var i = 0; i < item._paths.length; i++) {
//           var path = item._paths[i];
//           ctx.beginPath();
//           var p = path[path.length - 1];
//           ctx.moveTo(p.x, p.y);
//           for (var j = 0; j < path.length; j++) {
//             p = path[j];
//             ctx.lineTo(p.x, p.y);
//           }
//           ctx.lineWidth = 2;
//           if (item.diff) {
//             ctx.setLineDash([5]);
//             ctx.lineWidth = 0.5;
//             ctx.stroke();
//             ctx.setLineDash([0]);
//           } else {
//             ctx.fill();
//             ctx.stroke();
//           }
//         }
//         break;
//     }
//     ctx.restore();
//   }

//   Renderer.prototype.highlightItem = function(item) {
//     var ctx = this.ctx, knobbySize = this.knobbySize, t = item._atransform;
//     ctx.save();
//     ctx.setTransform(t[0], t[2], t[1], t[3], t[4], t[5]); // local to world
//     switch (item.type) {
//       case 'disk':
//         ctx.beginPath();
//         ctx.arc(0, 0, item.radius, 0, 2 * Math.PI, false);
//         ctx.lineWidth = 1;
//         ctx.stroke();
//         ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//         break;
//       case 'bezier':
//         ctx.lineWidth = 1;
//         ctx.beginPath();
//         // Start at first point of first curve segment.
//         ctx.moveTo(item._curves[0][0].x, item._curves[0][0].y);
//         for (var i = 0; i < item._curves.length; i++) {
//           var seg = item._curves[i];
//           ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
//         }
//         ctx.stroke();
//         ctx.beginPath();
//         ctx.moveTo(-item.halfLength, 0);
//         ctx.lineTo(item.halfLength, 0);
//         ctx.setLineDash([5]);
//         ctx.stroke();
//         ctx.setLineDash([0]);
//         for (var i = 0; i < item.points.length; i++) {
//           var pi = item.points[i];
//           ctx.strokeRect(pi.x - knobbySize, pi.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
//         }
//         ctx.strokeRect(-item.halfLength - 2*knobbySize, -2*knobbySize, 4 * knobbySize, 4 * knobbySize);
//         ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//         ctx.strokeRect(item.halfLength - knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
//         break;
//       case 'group':
//         // ctx.strokeRect(item._cx - knobbySize, item._cy - knobbySize, 2 * knobbySize, 2 * knobbySize);
//         for (var i = 0; i < item._paths.length; i++) {
//           var path = item._paths[i];
//           ctx.beginPath();
//           var p = path[path.length - 1];
//           ctx.moveTo(p.x, p.y);
//           for (var j = 0; j < path.length; j++) {
//             p = path[j];
//             ctx.lineTo(p.x, p.y);
//           }
//           ctx.lineWidth = 2;
//           if (item.diff) {
//             ctx.setLineDash([5]);
//             ctx.lineWidth = 0.5;
//             ctx.stroke();
//             ctx.setLineDash([0]);
//           } else {
//             ctx.stroke();
//           }
//         }
//         break;
//     }
//     ctx.restore();
//   }

//   // function getSelectionBounds(root) {
//   //   var bounds = {};
//   //   visit(
//   //       root,
//   //       function(item) {
//   //         if (!isSelected(item))
//   //           return;
//   //         var itemBounds = item._bounds;
//   //         var leftTop = { x: itemBounds.left, y: itemBounds.top };
//   //         var rightBtm = { x: itemBounds.right, y: itemBounds.bottom };
//   //         VecMat(leftTop, item._atransform);
//   //         VecMat(rightBtm, item._atransform);
//   //         Box2d.extend(bounds, leftTop.x, leftTop.y);
//   //         Box2d.extend(bounds, rightBtm.x, rightBtm.y);
//   //       });
//   //   return bounds;
//   // }

//   function firstHit(item, hitInfo) {
//     return hitInfo.item;
//   }

//   Renderer.prototype.hitTestItem = function(item, p) {
//     var knobbySize = this.knobbySize, hitTolerance = this.hitTolerance,
//         transformableModel = this.model.transformableModel,
//         transform = transformableModel.transform(item),
//         inverseTransform = transformableModel.inverseTransform(item),
//         localP = VecMatNew(p, inverseTransform),
//         hitInfo, r, dx, dy, distSquared;
//     switch (item.type) {
//       case 'disk':
//         return diagrams.hitTestDisk(0, 0, item.radius, localP, hitTolerance);
//       case 'bezier':
//         if (Math.abs(p.x + item.halfLength) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance)
//           return { end0: true };
//         else if (Math.abs(p.x) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance)
//           return { mid: true };
//         else if (Math.abs(p.x - item.halfLength) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance)
//           return { end1: true };

//         for (var i = 0; i < item.points.length; i++) {
//           var pi = item.points[i];
//           if (Math.abs(p.x - pi.x) <= knobbySize + hitTolerance && Math.abs(p.y - pi.y) <= knobbySize + hitTolerance)
//             return { point: i };
//         }
//         for (var i = 0; i < item._curves.length; i++) {
//           var curve = item._curves[i];
//           if (geometry.hitTestCurveSegment(curve[0], curve[1], curve[2], curve[3], p, hitTolerance))
//             return { position: true, curve: i };
//         }
//         break;
//       case 'group':
//         if (!item.op || !item._paths)
//           return;
//         for (var i = 0; i < item._paths.length; i++) {
//           var path = item._paths[i];
//           ctx.beginPath();
//           ctx.moveTo(path[0].x, path[0].y);
//           for (var j = 1; j < path.length; j++)
//             ctx.lineTo(path[j].x, path[j].y);
//           ctx.closePath();
//           if (ctx.isPointInPath(p.x, p.y))
//             return { position: true };
//         }
//         break;
//     }
//   }

// //------------------------------------------------------------------------------
// //TODO theme should be last
//   function Editor(model, theme, canvas, updateFn) {
//     var self = this;
//     this.model = model;
//     this.board = model.root;
//     editingContext.extend(model);

//     this.canvas = canvas;
//     this.updateFn = updateFn;

//     this.ctx = canvas.getContext('2d');

//     if (!theme)
//       theme = diagrams.theme.create();
//     var renderer = this.renderer = new Renderer(model, ctx, theme);

//     var palette = this.palette = {
//       root: {
//         type: 'palette',
//         x: 0,
//         y: 0,
//         items: [
//           {
//             type: 'disk',
//             id : 1,
//             x: 56,
//             y: -56,
//             radius: 16,
//           },
//           {
//             type: 'bezier',
//             id: 2,
//             x: 64,
//             y: -120,
//             halfLength: 48,
//             points: [
//               { x: -24, y: 15 },
//               { x: 0, y: 20 },
//               { x: 24, y: 15 }
//             ],
//           },
//         ]
//       }
//     }
//     dataModels.observableModel.extend(palette);
//     dataModels.hierarchicalModel.extend(palette);
//     dataModels.transformableModel.extend(palette);
//     this.updateGeometry(palette.root);

//     this.mouseController = new diagrams.MouseController();
//     this.mouseController.addHandler('beginDrag', function() {
//       self.beginDrag();
//     });

//     this.validateLayout();
//   }

//   Editor.prototype.isPaletteItem = function(item) {
//     var hierarchicalModel = this.palette.hierarchicalModel;
//     return hierarchicalModel.getParent(item) === this.palette.root;
//   }

//   Editor.prototype.draw = function() {
//     var self = this, renderer = this.renderer, ctx = this.ctx;

//     this.updateGeometry();

//     ctx.save();
//     ctx.fillStyle = '#6666cc';
//     ctx.strokeStyle = '#F0F0F0';
//     ctx.lineJoin = 'round'

//     visit(this.board, function(item) {
//       renderer.drawItem(item);
//     });

//     ctx.strokeStyle = '#40F040';
//     visit(this.board, function(item) {
//       renderer.highlightItem(item);
//     });

//     ctx.fillStyle = '#6666cc';
//     ctx.strokeStyle = '#F0F0F0';
//     this.palette.items.foreach(function(item) {
//       renderer.drawItem(item);
//     })

//     ctx.restore();
//   }

//   function firstHit(item, hitInfo) {
//     return hitInfo.item;
//   }

//   // function firstUnselectedStateHit(item, hitInfo) {
//   //   return hitInfo.item || isSelected(item);
//   // }

//   Editor.prototype.hitTest = function(p, filterFn) {
//     if (!filterFn)
//       filterFn = firstHit;
//   }
//   function hitTest(p, filterFn) {
//     var px = p.x, py = p.y;
//     var hitTolerance = config.hitTolerance;
//     var hitInfo = {};

//     function hitItem(item) {
//       if (filterFn(item, hitInfo))
//         return;
//       var knobbySize = config.knobbySize;
//       var p = VecMatNew({ x: px, y: py }, item._aitransform);
//       var r, dx, dy, distSquared;
//       switch (item.type) {
//         case 'disk':
//           r = item.radius;
//           distSquared = p.x * p.x + p.y * p.y;
//           var inner = r - hitTolerance;
//           var outer = r + hitTolerance;
//           if (distSquared <= outer * outer) {
//             if (distSquared > inner * inner) {
//               hitInfo.item = item;
//               hitInfo.part = 'edge';
//             } else if (Math.abs(p.x) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance) {
//               hitInfo.item = item;
//               hitInfo.part = 'position';
//             }
//           }
//           if (hitInfo.item && !isSelected(item))
//             hitInfo.part = 'position';
//           break;
//         case 'bezier':
//           for (var i = 0; i < item._curves.length; i++) {
//             var curve = item._curves[i];
//             if (geometry.hitTestCurveSegment(curve[0], curve[1], curve[2], curve[3], p, hitTolerance)) {
//               hitInfo.item = item;
//               hitInfo.part = 'position';
//             }
//           }
//           if (!isSelected(item._parent) && !item._parent._contentSelected)
//             break;
//           var t = item._aitransform;
//           var p1 = VecMatNew({ x: px, y: py }, t);
//           for (var i = 0; i < item.points.length; i++) {
//             var pi = item.points[i];
//             if (Math.abs(p.x - pi.x) <= knobbySize + hitTolerance && Math.abs(p.y - pi.y) <= knobbySize + hitTolerance) {
//               hitInfo.item = item;
//               hitInfo.part = 'point';
//               hitInfo.index = i;
//             }
//           }
//           if (Math.abs(p.x + item.halfLength) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance) {
//             hitInfo.item = item;
//             hitInfo.part = 'end0';
//           } else if (Math.abs(p.x) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance) {
//             hitInfo.item = item;
//             hitInfo.part = 'mid';
//           } else if (Math.abs(p.x - item.halfLength) <= knobbySize + hitTolerance && Math.abs(p.y) <= knobbySize + hitTolerance) {
//             hitInfo.item = item;
//             hitInfo.part = 'end1';
//           }
//           if (hitInfo.item && !isSelected(item))
//             hitInfo.part = 'position';
//           break;
//         case 'group':
//           if (!item.op || !item._paths)
//             return;
//           for (var i = 0; i < item._paths.length; i++) {
//             var path = item._paths[i];
//             ctx.beginPath();
//             ctx.moveTo(path[0].x, path[0].y);
//             for (var j = 1; j < path.length; j++)
//               ctx.lineTo(path[j].x, path[j].y);
//             ctx.closePath();
//             if (ctx.isPointInPath(p.x, p.y)) {
//               hitInfo.item = item;
//               hitInfo.part = 'position';
//             }
//           }
//           // if (item._selected) {
//           //   for (var i = 0; i < item.knots.length; i++) {
//           //     var pKnot = item.knots[i]._position;
//           //     if (Math.abs(p.x - pKnot.x) <= knobbySize + hitTolerance && Math.abs(p.y - pKnot.y) <= knobbySize + hitTolerance) {
//           //       hitInfo.item = item;
//           //       hitInfo.part = 'knot';
//           //       hitInfo.index = i;
//           //     }
//           //   }
//           // }
//           break;
//       }
//     }
//     reverseVisit(palette, hitItem);
//     if (hitInfo.item)
//       return hitInfo;

//     reverseVisit(board, hitItem);

//     return hitInfo;
//   }


//   function beginDrag() {
//     valueTracker = new dataModels.ValueChangeTracker(model);
//   }

//   function endDrag() {
//     transactionModel.beginTransaction("Drag");

//     // Find item beneath mouse.
//     var hitInfo = hitTest(mouseController.getMouse(), firstUnselectedStateHit);
//     var parent = board;
//     if (hitInfo.item) {
//       // Find deepest group containing hit item.
//       parent = hitInfo.item;
//       while (parent.type != 'group')
//         parent = hierarchicalModel.getParent(parent);
//     }

//     if (addingNewItem) {
//       selectionModel.forEach(function(item) {
//         addItemToParent(item, parent);
//       });
//     }

//     valueTracker.end();
//     valueTracker = null;
//     transactionModel.endTransaction();

//     // updateGeometry();
//     addingNewItem = false;
//     mouseHitInfo = null;

//   }

//   // Calculate auto-rotation using parent hull.
//   function autoRotateBezier(item) {
//     var observableModel = model.observableModel;
//     var parent = item._parent;
//     var p = { x: item.x, y: item.y };
//     if (parent.type == 'group' && parent.op == 'hull') {
//       var hull = parent._paths[0];
//       var i0 = findClosestPathSegment(hull, p);
//       var i1 = (i0 < hull.length - 1) ? i0 + 1 : 0;
//       var t = getTurn(hull[i0].x - hull[i1].x, hull[i0].y - hull[i1].y);
//       observableModel.changeValue(item, '_rotation', t * 2 * Math.PI);
//     }
//   }

//   function drag() {
//     var observableModel = model.observableModel;
//     updateGeometry();
//     selectionModel.forEach(function(item) {
//       var r, distSquared;
//       var local_click = VecMatNew(mouseController.getMouseDown(), item._aitransform);
//       var parent_click = VecMatNew(mouseController.getMouseDown(), item._parent._aitransform);
//       var local_mouse = VecMatNew(mouseController.getMouse(), item._aitransform);
//       var parent_mouse = VecMatNew(mouseController.getMouse(), item._parent._aitransform);
//       var local_drag = { x: local_mouse.x - local_click.x, y: local_mouse.y - local_click.y };
//       var parent_drag = { x: parent_mouse.x - parent_click.x, y: parent_mouse.y - parent_click.y };
//       var snapshot = valueTracker.getSnapshot(item);

//       switch (item.type) {
//         case 'disk':
//           if (mouseHitInfo.part == 'position') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
//           } else if (mouseHitInfo.part == 'edge') {
//             var dx1 = local_click.x, dy1 = local_click.y;
//             var dx2 = local_mouse.x, dy2 = local_mouse.y;
//             observableModel.changeValue(item, 'radius', snapshot.radius * Math.sqrt((dx2 * dx2 + dy2 * dy2) / (dx1 * dx1 + dy1 * dy1)));
//           }
//           break;
//         case 'bezier':
//           var newLength;
//           if (mouseHitInfo.part == 'position') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
//             autoRotateBezier(item);
//           } else if (mouseHitInfo.part == 'point') {
//             var pt = item.points[mouseHitInfo.index];
//             var oldPt = item._points[mouseHitInfo.index];
//             observableModel.changeValue(pt, 'x', oldPt.x + local_drag.x);
//             observableModel.changeValue(pt, 'y', oldPt.y + local_drag.y);
//           } else if (mouseHitInfo.part == 'end0') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x / 2);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y / 2);
//             newLength = LineLength(parent_mouse.x, parent_mouse.y, item.x, item.y);
//             autoRotateBezier(item);
//           } else if (mouseHitInfo.part == 'end1') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x / 2);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y / 2);
//             newLength = LineLength(parent_mouse.x, parent_mouse.y, item.x, item.y);
//             autoRotateBezier(item);
//           } else if (mouseHitInfo.part == 'mid') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
//             autoRotateBezier(item);
//           }
//           if (newLength) {
//             if (newLength > 0.00001) {
//               item.halfLength = newLength;
//               var scale = newLength / snapshot.halfLength;
//               for (var i = 0; i < item.points.length; i++) {
//                 var pi = item.points[i], oldPi = item._points[i];
//                 observableModel.changeValue(pi, 'x', scale * oldPi.x);
//                 observableModel.changeValue(pi, 'y', scale * oldPi.y);
//               }
//             }
//           }
//           break;
//         case 'group':
//           if (mouseHitInfo.part == 'position') {
//             observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
//             observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
//           } else if (mouseHitInfo.part == 'knot') {
//             // var knot = item.knots[mouseHitInfo.index];
//             // knot.t = getTurn(mouse_x - item._cx, mouse_y - item._cy);
//             // var hullPt = knot._edge.p0;
//             // // Dot product with normal to get distance off edge.
//             // knot.d = (mouse_x - hullPt.x) * hullPt.nx + (mouse_y - hullPt.y) * hullPt.ny;
//           }
//           break;
//       }
//     });
//   }

//   function indices_adjacent(i1, i2, length, wraps) {
//     var next = i1 + 1;
//     if (wraps && next == length)
//       next = 0;
//     var prev = i1 - 1;
//     if (wraps && prev < 0)
//       prev = length - 1;
//     return i2 == next || i2 == prev;
//   }

//   function makeInterpolatingPoints(bezier) {
//     var points = [];
//     var length = bezier.points.length;
//     var halfLength = bezier.halfLength;
//     points.push({ x: -halfLength * 2, y: 0 });
//     points.push({ x: -halfLength, y: 0 });
//     for (var i = 0; i < length; i++) {
//       var pi = bezier.points[i];
//       points.push({ x: pi.x, y: pi.y });
//     }
//     points.push({ x: halfLength, y: 0 });
//     points.push({ x: halfLength * 2, y: 0 });
//     return points;
//   }

//   // Paths are computed in the local space of the item, translated when combining.
//   function updateGeometry(root) {
//     if (!root)
//       root = board;
//     var diffPathStack = [];
//     function updatePass1(item) {
//       // // build local transform, world transform, and inverses at all nodes
//       // var rot = item.rotation || item._rotation || 0;
//       // var cos = Math.cos(rot), sin = Math.sin(rot);
//       // var tx = item.x, ty = item.y;
//       // item._transform = [ cos, -sin,
//       //                     sin, cos,
//       //                     tx, ty ];
//       // item._itransform = [ cos, sin,
//       //                     -sin, cos,
//       //                     -tx * cos + ty * sin, -tx * sin - ty * cos ];

//       // if (item._parent) {
//       //   item._atransform = MatMat(item._transform, item._parent._atransform);
//       //   item._aitransform = MatMat(item._parent._aitransform, item._itransform);
//       // } else {
//       //   // root transform is a flip about the x-axis.
//       //   item._atransform = item._aitransform = [1, 0, 0, -1, 0, 0];
//       // }

//       if (item.type == 'group')
//         diffPathStack.push(new ClipperLib.Paths());

//       // Create paths for primitives.
//       var path = [];
//       var subdivisions, step, x, y;
//       var dx, dy, cx, cy;
//       switch (item.type) {
//         case 'disk':
//           var r = item.radius;
//           subdivisions = Math.sqrt(r) * 16;
//           for (var i = 0; i < subdivisions; i++) {
//             x = r * Math.cos(2 * Math.PI * i / subdivisions);
//             y = r * Math.sin(2 * Math.PI * i / subdivisions);
//             path.push({ x: x, y: y });
//           }
//           break;
//         case 'bezier':
//           // Generate local curve for unbound bezier items.
//           if (!item._parent || item._parent.type != 'group' || item._parent.op != 'hull') {
//             var points = makeInterpolatingPoints(item);
//             item._curves = [];
//             item._curveLengths = [];
//             generateCurveSegments(points, item._curves, item._curveLengths);
//           }
//           // // Convert curves to points.
//           // for (var i = 0; i < length + 1; i++) {
//           //   subdivisions = item._curveLengths[i] / 4;
//           //   step = 1.0 / subdivisions;
//           //   var curve = item._curves[i];
//           //   for (var t = 0; t < 1; t += step) {
//           //     var t2 = t * t;
//           //     var t3 = t2 * t;
//           //     var c1 = 1 - 3 * t + 3 * t2 - t3;
//           //     var c2 = 3 * t - 6 * t2 + 3 * t3;
//           //     var c3 = 3 * t2 - 3 * t3;
//           //     var x = c1 * curve[0].x + c2 * curve[1].x + c3 * curve[2].x + t3 * curve[3].x;
//           //     var y = c1 * curve[0].y + c2 * curve[1].y + c3 * curve[2].y + t3 * curve[3].y;
//           //     path.push({ x: x, y: y });
//           //   }
//           // }
//           // // add the last curve point.
//           // path.push({ x: curve[3].x, y: curve[3].y });
//           // path.push({ x: 0, y: 0 });
//           break;
//       }

//       item._paths = [ path ];

//       // Add diff items to the parent item's clipper.
//       if (item.diff) {
//         diffPathStack[diffPathStack.length - 1].push(ToClipperPath(path, item));
//       }
//     }

//     function updatePass2(item) {
//       var points = [];
//       // Now that all child items are updated, build the paths for
//       // unions and hulls.
//       if (item.type == 'group') {
//         var diffPaths = diffPathStack.pop();
//         // If there are diff paths, adjust child groups.
//         // if (diffPaths.length) {
//         //   var clipper = new ClipperLib.Clipper();
//         //   clipper.AddPath(diffPaths, ClipperLib.PolyType.ptSubject, true);
//         //   clipper.AddPaths(diffPaths, ClipperLib.PolyType.ptClip, true);
//         //   var allDiffs = new ClipperLib.Paths();
//         //   clipper.Execute(ClipperLib.ClipType.ctXor, allDiffs);

//         //   for (var i = 0; i < item.items.length; i++) {
//         //     var subItem = item.items[i];
//         //     if (subItem.type == 'group') {
//         //       clipper.Clear();
//         //       for (var j = 0; j < subItem._paths.length; j++) {
//         //         var path = subItem._paths[j];
//         //         clipper.AddPath(ToClipperPath(path, subItem), ClipperLib.PolyType.ptSubject, true)
//         //       }
//         //       clipper.AddPaths(allDiffs, ClipperLib.PolyType.ptClip, true);
//         //       var solution = new ClipperLib.Path();
//         //       clipper.Execute(ClipperLib.ClipType.ctDifference, solution);
//         //       if (solution.length) {
//         //         subItem._paths = [];
//         //         for (var j = 0; j < solution.length; j++) {
//         //           var solutionPath = solution[j];
//         //           var path = FromClipperPath(solutionPath, subItem);


//         //           subItem._paths.push(path);
//         //         }
//         //       }
//         //     }
//         //   }
//         // }

//         if (item.op == 'hull') {
//           var itemMap = new HashMap(model.dataModel.getId);
//           var subItems = item.items;
//           for (var i = 0; i < subItems.length; i++) {
//             var subItem = subItems[i];
//             if (!subItem.diff) {
//               for (var j = 0; j < subItem._paths.length; j++) {
//                 var path = subItem._paths[j];
//                 for (var k = 0; k < path.length; k++) {
//                   var p = path[k];
//                   p = { x: p.x, y: p.y, path: j, index: k, item: subItem };
//                   VecMat(p, subItem._transform);
//                   points.push(p);
//                 }
//               }
//             }
//           }

//           var hull = convexHull(points, item);
//           var subItems = item.items;
//           for (var i = 0; i < subItems.length; i++) {
//             var subItem = subItems[i];
//             if (subItem.type == 'bezier') {
//               var points = makeInterpolatingPoints(subItem);
//               var pointsLength = points.length;
//               for (var j = 0; j < pointsLength; j++) {
//                 var pj = points[j];
//                 // control point base into parent space.
//                 var p0 = { x: pj.x, y: 0 };
//                 VecMat(p0, subItem._transform);
//                 var seg0 = findClosestPathSegment(hull, p0);
//                 var seg1 = seg0 + 1;
//                 if (seg1 == hull.length)
//                   seg1 = 0;
//                 var norm = { x: hull[seg1].y - hull[seg0].y, y: hull[seg0].x - hull[seg1].x };
//                 geometry.vecNormalize(norm);
//                 var height = pj.y;
//                 norm.x *= height;
//                 norm.y *= height;
//                 var base = projectToPath(hull, seg0, p0);
//                 points[j] = { x: base.x + norm.x, y: base.y + norm.y };
//                 VecMat(points[j], subItem._itransform);
//               }
//               subItem._curves = [];
//               subItem._curveLengths = [];
//               generateCurveSegments(points, subItem._curves, subItem._curveLengths);
//             }
//           }
//           item._paths = [ hull ];
//         }
//       }

//       // Update local bounds.
//       item._bounds = {};
//       for (var i = 0; i < item._paths.length; i++)
//         Box2d.extendArray(item._bounds, item._paths[i]);
//     }
//     visit(root, updatePass1);
//     visit(root, updatePass2);
//   }

//   function onMouseDown(e) {
//     mouseController.onMouseDown(e);
//     mouseHitInfo = hitTest(mouseController.getMouse());
//     if (mouseHitInfo.item) {
//       if (!isSelected(mouseHitInfo.item) && !shiftKeyDown)
//         clearSelection();
//       select(mouseHitInfo.item);
//       updateFn(this);
//     } else {
//       if (!shiftKeyDown) {
//         clearSelection();
//         updateFn(this);
//       }
//     }
//   }

//   function onMouseMove(e) {
//     mouseController.onMouseMove(e);
//     var didClickItem = mouseHitInfo && mouseHitInfo.item;
//     if (didClickItem && mouseController.isDragging) {
//       if (mouseHitInfo.item._parent === palette)
//         addPaletteItem(mouseHitInfo.item);
//       else
//         reduceSelection();
//     }

//     if (didClickItem && mouseController.isDragging) {
//       drag();
//       updateFn(this);
//     }
//   }

//   function onMouseUp(e) {
//     if (mouseHitInfo && mouseHitInfo.item && mouseController.isDragging) {
//       endDrag();
//       updateFn(this);
//       mouseHitInfo = null;
//     }
//     mouseController.onMouseUp(e);
//   }

//   function onKeyDown(e) {
//     shiftKeyDown = e.shiftKey;

//     if (e.keyCode == 8) {
//       e.preventDefault();
//       deleteSelection();
//       clearSelection();
//       updateFn(this);
//     } else if (e.ctrlKey) {
//       if (e.keyCode == 65) {  // 'a'
//         selectAll();
//         updateFn(this);
//       } else if (e.keyCode == 90) {  // 'z'
//         if (transactionHistory.getUndo()) {
//           clearSelection();
//           transactionHistory.undo();
//           updateGeometry();
//           updateFn(this);
//         }
//       } else if (e.keyCode == 89) {  // 'y'
//         if (transactionHistory.getRedo()) {
//           clearSelection();
//           transactionHistory.redo();
//           updateGeometry();
//           updateFn(this);
//         }
//       } else if (e.keyCode == 88) { // 'x'
//         copy();
//         deleteSelection();
//         updateFn(this);
//       } else if (e.keyCode == 67) { // 'c'
//         copy();
//         updateFn(this);
//       } else if (e.keyCode == 86) { // 'v'
//         if (scrap) {
//           clearSelection();
//           paste();
//           updateFn(this);
//         }
//       } else if (e.keyCode == 71) { // 'g'
//         // board_group();
//         // renderEditor();
//       } else if (e.keyCode == 83) { // 's'
//         var text = JSON.stringify(
//           statechart,
//           function(key, value) {
//             if (key.toString().charAt(0) == '_')
//               return;
//             return value;
//           },
//           2);
//         // Writes statechart as JSON to console.
//         console.log(text);
//       }
//     }
//   }

//   function onKeyUp(e) {
//     shiftKeyDown = e.shiftKey;
//   }


//   return {
//     config: config,
//     bind: bind,
//     draw: draw,
//     onMouseDown: onMouseDown,
//     onMouseMove: onMouseMove,
//     onMouseUp: onMouseUp,
//     onKeyDown: onKeyDown,
//     onKeyUp: onKeyUp,
//   };
// })();




// var shape_data = {
//   "type": "group",
//   "x": 0,
//   "y": 0,
//   "id": 153,
//   "items": [
//     {
//       "type": "group",
//       "op": "hull",
//       "id": 24,
//       "x": 125,
//       "y": -752,
//       "items": [
//         {
//           "type": "disk",
//           "id": 10,
//           "x": 113,
//           "y": 39,
//           "radius": 16.8931507768809
//         },
//         {
//           "type": "disk",
//           "id": 11,
//           "x": 121,
//           "y": 632,
//           "radius": 111.13066811916961
//         },
//         {
//           "type": "disk",
//           "id": 12,
//           "x": 516,
//           "y": 562,
//           "radius": 68.0425110401971
//         },
//         {
//           "type": "disk",
//           "id": 13,
//           "x": 575,
//           "y": 25,
//           "radius": 6.554923095104073
//         },
//         {
//           "type": "bezier",
//           "id": 1005,
//           "x": 42,
//           "y": 455,
//           "halfLength": 175,
//           "points": [
//             {
//               "id": 1002,
//               "x": -78.64501291431935,
//               "y": 10.55150289796996
//             },
//             {
//               "id": 1003,
//               "x": 3.165839963423892,
//               "y": -33.40933597730423
//             },
//             {
//               "id": 1004,
//               "x": 104.81415790364744,
//               "y": 15.53265921934953
//             }
//           ],
//         },
//         {
//           "type": "bezier",
//           "id": 1011,
//           "x": 350.5,
//           "y": 689,
//           "halfLength": 185,
//           "points": [
//             {
//               "id": 1008,
//               "x": -89.08810766810325,
//               "y": 10.507334730128534
//             },
//             {
//               "id": 1009,
//               "x": -53.25598017376271,
//               "y": -55.19850813658798
//             },
//             {
//               "id": 1010,
//               "x": 52.88397262961445,
//               "y": 0.9158315982501593
//             }
//           ],
//         }
//       ]
//     },
//     {
//       "type": "group",
//       "id": 5,
//       "op": "hull",
//       "x": 458,
//       "y": -712,
//       "items": [
//         {
//           "type": "disk",
//           "id": 111,
//           "x": 99,
//           "y": 60,
//           "radius": 16
//         },
//         {
//           "type": "disk",
//           "id": 112,
//           "x": 38,
//           "y": 47,
//           "radius": 15.947602931050417
//         },
//         {
//           "type": "disk",
//           "id": 113,
//           "x": 99,
//           "y": 129,
//           "radius": 17.673022423929776
//         }
//       ]
//     },
//     {
//       "type": "group",
//       "id": 50,
//       "op": "hull",
//       "x": 172,
//       "y": -696,
//       "items": [
//         {
//           "id": 111,
//           "type": "disk",
//           "x": 99,
//           "y": 60,
//           "radius": 16
//         },
//         {
//           "id": 112,
//           "type": "disk",
//           "x": 153,
//           "y": 45,
//           "radius": 15.947602931050417
//         },
//         {
//           "id": 113,
//           "type": "disk",
//           "x": 99,
//           "y": 129,
//           "radius": 17.673022423929776
//         }
//       ]
//     },
//     {
//       "type": "group",
//       "op": "hull",
//       "id": 10387,
//       "x": 381,
//       "y": -220,
//       "items": [
//         {
//           "id": 10378,
//           "type": "disk",
//           "x": -37,
//           "y": -4,
//           "radius": 28.421619177682725,
//         }
//       ]
//     },
//     {
//       "id": 10381,
//       "type": "group",
//       "op": "hull",
//       "x": 400,
//       "y": -304,
//       "items": [
//         {
//           "id": 10371,
//           "type": "disk",
//           "x": 0,
//           "y": 0,
//           "radius": 29.071357000214743,
//         }
//       ]
//     },
//     {
//       "id": 1039,
//       "type": "group",
//       "op": "hull",
//       "x": 432,
//       "y": -216,
//       "items": [
//         {
//           "id": 1037,
//           "type": "disk",
//           "x": 11,
//           "y": -5,
//           "radius": 30.117587501855482,
//         }
//       ]
//     },
//     {
//       "type": "group",
//       "op": "hull",
//       "id": 1054,
//       "x": 344,
//       "y": -684,
//       "items": [
//         {
//           "id": 1053,
//           "type": "disk",
//           "x": 0,
//           "y": 0,
//           "radius": 12.80816066388288,
//         },
//         {
//           "id": 1056,
//           "type": "disk",
//           "x": 47,
//           "y": -20,
//           "radius": 4.478914616788309,
//         }
//       ]
//     },
//     {
//       "id": 11054,
//       "type": "group",
//       "op": "hull",
//       "x": 465,
//       "y": -681,
//       "items": [
//         {
//           "id": 11053,
//           "type": "disk",
//           "x": 0,
//           "y": 0,
//           "radius": 12.80816066388288,
//         },
//         {
//           "id": 11056,
//           "type": "disk",
//           "x": -45,
//           "y": -27,
//           "radius": 4.478914616788309,
//         }
//       ]
//     }
//   ]
// }