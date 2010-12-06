Project  = fxCanvas
projURL  = http://code.google.com/p/fxcanvas/
Version  = 0.2(beta2)
Codename = supersonic
Date     = $(shell date '+%Y%m%d')
Year     = $(shell date '+%Y')

# Google Closure Compiler
compiler = $(HOME)/bin/compiler.jar
header   = $(Project) v$(Version) ($(Date))
srcdir   = src
bindir   = .
demodir  = demo
archives = archives
fxcanvas_as = $(srcdir)/fxCanvas.as
jooscript_js   = $(bindir)/jooscript.js
fxcanvas_js = $(bindir)/fxcanvas.js
fxcanvas_swf      = $(bindir)/fxcanvas.swf
flash_backend_js  = $(bindir)/flash_backend.js
canvas_backend_js = $(bindir)/canvas_backend.js
cakesrc  = $(demodir)/cakejs/src/cake.js
cakejs   = $(demodir)/cakejs/bin/cake.js

flash_backend    = FlashRenderingBackend2D.js
canvas_backend   = CanvasRenderingBackend2D.js
common   = util.js \
					 config.js \
					 fxcanvas.js \
					 extCanvasRenderingContext2D.js \
					 ContextMenu.js

common  := $(addprefix $(srcdir)/,$(common))
canvas_backend  := $(addprefix $(srcdir)/,$(canvas_backend))
flash_backend   := $(addprefix $(srcdir)/,$(flash_backend))
jsfiles := $(wildcard $(srcdir)/*.js)

objects  = $(fxcanvas_swf) $(fxcanvas_js) $(flash_backend_js) $(canvas_backend_js)

.PHONY: $(fxcanvas_swf) docs

all: $(objects)

$(fxcanvas_swf): $(fxcanvas_as) 
	mxmlc -incremental $(fxcanvas_as) -output $(fxcanvas_swf)

# FIXME: with --compilation_level ADVANCED_OPTIMIZATIONS output is broken
#
$(fxcanvas_js): $(common)
	echo '/*! $(header)' > $(fxcanvas_js)
	echo '	- copyright 2009-$(Year), Evgeny Burzak <$(projURL)>' >> $(fxcanvas_js)
	echo '	- released under the MIT License <http://www.opensource.org/licenses/mit-license.php>\n*/' >> $(fxcanvas_js)
	java -jar $(compiler) $(addprefix --js ,$(common)) | \
		sed "s/\$$(Version)/$(Version)/" |\
		sed "s/\$$(flash_backend_js)/$(notdir $(flash_backend_js))/" |\
		sed "s/\$$(canvas_backend_js)/$(notdir $(canvas_backend_js))/" |\
		sed "s#\$$(projectURL)#$(projURL)#" >> $(fxcanvas_js)

$(flash_backend_js): $(flash_backend)
	echo '/*! $(header)  - Flash backend */' > $(flash_backend_js)
	java -jar $(compiler) $(addprefix --js ,$(flash_backend)) >> $(flash_backend_js)

$(canvas_backend_js): $(canvas_backend)
	echo '/*! $(header)  - Canvas backend */' > $(canvas_backend_js)
	java -jar $(compiler) $(addprefix --js ,$(canvas_backend)) >> $(canvas_backend_js)

zip:
	rm -rf "$(archives)/fxcanvas-$(Version)-$(Codename).zip"
	zip -r "$(archives)/fxcanvas-$(Version)-$(Codename).zip" \
		src demo docs tests \
		-i "*.js" "*.as" "*.swf" "*.jpg" "*.gif" "*.png" "*.htm?" "*.css" "*.php" README -x "demo/cakejs*"
	zip -r "$(archives)/fxcanvas-$(Version)-$(Codename).zip" $(fxcanvas_swf) $(jooscript_js) $(fxcanvas_js) $(flash_backend_js) $(canvas_backend_js) ReadMe.html Makefile debug.php save.php view.php proxy.php

cake:
	# CAKE does not included in archive due to big size of it. 
	# Can be grabbed from CAKE project page:
	#   http://code.google.com/p/cakejs/
	# or (if author does not commit my patch) from downloads:
	#   http://code.google.com/p/fxcanvas/downloads/list
	#
	if [ ! -d demo/cakejs ]; then exit 1; fi
	echo '/*! CAKE scene graph lib <http://code.google.com/p/cakejs/> \n    is released under the MIT License <http://www.opensource.org/licenses/mit-license.php>\n*/' > $(cakejs)
	cp -f $(jooscript_js) $(fxcanvas_js) $(flash_backend_js) $(canvas_backend_js) $(demodir)/cakejs/bin
	cp -f $(fxcanvas_swf) $(demodir)/cakejs/bin
	java -jar $(compiler) --js $(cakesrc) --warning_level QUIET >> $(cakejs)

cake-zip:
	make cake
	zip -r cake+fxcanvas-$(Version).zip demo/cakejs -x ".git" -x ".svn"
	
docs:
	./convert_wiki_pages "$(Version)" $(Codename) $(projURL)

release:
	make docs
	make all
	make cake
	make zip
	./publish "$(Version)"

clean:
	rm -f $(objects) $(fxcanvas_swf).cache

