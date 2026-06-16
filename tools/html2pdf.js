// JXA: render local HTML -> paginated A4 PDF via the WebKit print engine (vector, respects CSS page breaks).
ObjC.import('Cocoa');
ObjC.import('WebKit');
ObjC.import('Quartz');

function pump(s) {
  var e = $.NSDate.dateWithTimeIntervalSinceNow(s);
  while ($.NSDate.date.compare(e) == -1) {
    $.NSRunLoop.currentRunLoop.runModeBeforeDate($.NSDefaultRunLoopMode, $.NSDate.dateWithTimeIntervalSinceNow(0.04));
  }
}

var dir = '/Users/edenmartin/novae/';
var out = dir + 'Novae-Features.pdf';

$.NSApplication.sharedApplication;
var frame = $.NSMakeRect(0, 0, 794, 1000);
var web = $.WebView.alloc.initWithFrameFrameNameGroupName(frame, $(), $());
var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(frame, 0, 2, false);
win.contentView = web;

web.mainFrame.loadRequest($.NSURLRequest.requestWithURL($.NSURL.fileURLWithPath(dir + 'features.html')));
var dl = $.NSDate.dateWithTimeIntervalSinceNow(20);
while (web.isLoading && $.NSDate.date.compare(dl) == -1) { pump(0.1); }
pump(1.8); // settle layout/fonts

var view = web.mainFrame.frameView.documentView;

var pi = $.NSPrintInfo.sharedPrintInfo.copy;
pi.paperSize = $.NSMakeSize(595, 842);          // A4 in points
pi.leftMargin = 48; pi.rightMargin = 48;        // ~17 mm
pi.topMargin = 54; pi.bottomMargin = 48;        // ~19/17 mm
pi.horizontalPagination = 1;                    // fit width
pi.verticalPagination = 0;                      // auto (paginate)
pi.horizontallyCentered = false;
pi.verticallyCentered = false;

var d = pi.dictionary;
d.setObjectForKey($.NSPrintSaveJob, $.NSPrintJobDisposition);
d.setObjectForKey($.NSURL.fileURLWithPath(out), $.NSPrintJobSavingURL);

var op = $.NSPrintOperation.printOperationWithViewPrintInfo(view, pi);
op.showsPrintPanel = false;
op.showsProgressPanel = false;
op.runOperation;
pump(1.5);

var fm = $.NSFileManager.defaultManager;
if (!fm.fileExistsAtPath(out)) { console.log('FAIL: no output'); } else {
  var attrs = fm.attributesOfItemAtPathError(out, null);
  var size = ObjC.unwrap(attrs.js ? attrs.objectForKey('NSFileSize') : 0);
  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(out));
  var pages = doc.js ? doc.pageCount : 0;
  var first = doc.js ? (ObjC.unwrap(doc.pageAtIndex(0).string) || '') : '';
  console.log('pages=' + pages + ' sizeKB=' + Math.round(size / 1024) + ' titleOnP1=' + /NOVA/.test(first));
}
