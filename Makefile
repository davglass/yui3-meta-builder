target all:
		@./lib/gallery.js
		@./lib/yui2.js
		@echo "Files are Done!!"
		@ls -lha ./out/*.js
