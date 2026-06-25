EXT_DIR = ~/.local/share/gnome-shell/extensions/strc-price-panel@custom.github.com

install:
	cp -r . $(EXT_DIR)
	cd $(EXT_DIR) && glib-compile-schemas schemas/
	@echo "Installed. Enable with: gnome-extensions enable strc-price-panel@custom.github.com"

uninstall:
	gnome-extensions disable strc-price-panel@custom.github.com || true
	rm -rf $(EXT_DIR)
	@echo "Uninstalled."

reload:
	cp -r . $(EXT_DIR)
	cd $(EXT_DIR) && glib-compile-schemas schemas/
	gnome-extensions disable strc-price-panel@custom.github.com || true
	sleep 1
	gnome-extensions enable strc-price-panel@custom.github.com
	@echo "Reloaded."

.PHONY: install uninstall reload
