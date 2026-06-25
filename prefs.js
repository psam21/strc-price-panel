import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class StrcPricePanelPrefs extends ExtensionPreferences {
    getPreferencesWidget() {
        const settings = this.getSettings();
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 12,
        });

        // --- General ---
        box.append(this._sectionLabel('General'));

        box.append(this._row('Ticker symbol', new Gtk.Entry({
            text: settings.get_string('ticker'),
            hexpand: true,
        }), (entry) => {
            settings.set_string('ticker', entry.text);
        }));

        const sourceCombo = new Gtk.ComboBoxText({
            hexpand: true,
        });
        sourceCombo.append('yahoo', 'Yahoo Finance');
        sourceCombo.append('finnhub', 'Finnhub');
        sourceCombo.append('custom', 'Custom URL');
        sourceCombo.set_active_id(settings.get_string('data-source'));
        sourceCombo.connect('changed', (combo) => {
            settings.set_string('data-source', combo.get_active_id());
        });
        box.append(this._row('Data source', sourceCombo));

        const customUrlEntry = new Gtk.Entry({
            text: settings.get_string('custom-url'),
            hexpand: true,
            visible: settings.get_string('data-source') === 'custom',
        });
        customUrlEntry.connect('changed', (entry) => {
            settings.set_string('custom-url', entry.text);
        });
        box.append(this._row('Custom API URL', customUrlEntry));

        const finnhubEntry = new Gtk.Entry({
            text: settings.get_string('finnhub-api-key'),
            hexpand: true,
            visible: settings.get_string('data-source') === 'finnhub',
        });
        finnhubEntry.connect('changed', (entry) => {
            settings.set_string('finnhub-api-key', entry.text);
        });
        box.append(this._row('Finnhub API key', finnhubEntry));

        sourceCombo.connect('changed', () => {
            const id = sourceCombo.get_active_id();
            customUrlEntry.visible = id === 'custom';
            finnhubEntry.visible = id === 'finnhub';
        });

        const refreshSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 3600,
                step_increment: 10,
            }),
            value: settings.get_int('refresh-interval'),
            numeric: true,
        });
        refreshSpin.connect('value_changed', (spin) => {
            settings.set_int('refresh-interval', Math.round(spin.value));
        });
        box.append(this._row('Refresh interval (s)', refreshSpin));

        // --- Display ---
        box.append(this._sectionLabel('Display'));

        const prefixEntry = new Gtk.Entry({
            text: settings.get_string('prefix'),
            hexpand: true,
        });
        prefixEntry.connect('changed', (entry) => {
            settings.set_string('prefix', entry.text);
        });
        box.append(this._row('Price prefix', prefixEntry));

        const decimalsSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 6,
                step_increment: 1,
            }),
            value: settings.get_int('decimal-places'),
            numeric: true,
        });
        decimalsSpin.connect('value_changed', (spin) => {
            settings.set_int('decimal-places', Math.round(spin.value));
        });
        box.append(this._row('Decimal places', decimalsSpin));

        const fontSizeSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 60,
                upper: 200,
                step_increment: 5,
            }),
            value: settings.get_int('font-size'),
            numeric: true,
        });
        fontSizeSpin.connect('value_changed', (spin) => {
            settings.set_int('font-size', Math.round(spin.value));
        });
        box.append(this._row('Font size (%)', fontSizeSpin));

        const showArrowSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-arrow'),
            halign: Gtk.Align.START,
        });
        showArrowSwitch.connect('notify::active', (sw) => {
            settings.set_boolean('show-arrow', sw.active);
        });
        box.append(this._row('Show movement arrow', showArrowSwitch));

        const showChangeSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-change'),
            halign: Gtk.Align.START,
        });
        showChangeSwitch.connect('notify::active', (sw) => {
            settings.set_boolean('show-change', sw.active);
        });
        box.append(this._row('Show dollar change', showChangeSwitch));

        const showPercentSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-percent'),
            halign: Gtk.Align.START,
        });
        showPercentSwitch.connect('notify::active', (sw) => {
            settings.set_boolean('show-percent', sw.active);
        });
        box.append(this._row('Show percent change', showPercentSwitch));

        // --- Colors ---
        box.append(this._sectionLabel('Colors'));

        box.append(this._row('Price up', this._colorButton('color-up', settings)));
        box.append(this._row('Price down', this._colorButton('color-down', settings)));
        box.append(this._row('Price unchanged', this._colorButton('color-neutral', settings)));
        box.append(this._row('Default text', this._colorButton('text-color', settings)));

        // --- Position ---
        box.append(this._sectionLabel('Position'));

        const posCombo = new Gtk.ComboBoxText({ hexpand: true });
        posCombo.append('left', 'Left');
        posCombo.append('center', 'Center');
        posCombo.append('right', 'Right');
        posCombo.set_active_id(settings.get_string('position'));
        posCombo.connect('changed', (combo) => {
            settings.set_string('position', combo.get_active_id());
        });
        box.append(this._row('Panel position', posCombo));

        const orderSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: -10,
                upper: 10,
                step_increment: 1,
            }),
            value: settings.get_int('panel-order'),
            numeric: true,
        });
        orderSpin.connect('value_changed', (spin) => {
            settings.set_int('panel-order', Math.round(spin.value));
        });
        box.append(this._row('Order within slot', orderSpin));

        return box;
    }

    _sectionLabel(text) {
        const label = new Gtk.Label({
            label: `<b>${text}</b>`,
            use_markup: true,
            halign: Gtk.Align.START,
            margin_top: 12,
        });
        return label;
    }

    _row(labelText, widget) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        });
        const label = new Gtk.Label({
            label: labelText,
            halign: Gtk.Align.START,
            hexpand: true,
        });
        box.append(label);
        box.append(widget);
        return box;
    }

    _colorButton(key, settings) {
        const btn = new Gtk.ColorButton({
            rgba: this._hexToRgba(settings.get_string(key)),
        });
        btn.connect('color-set', (button) => {
            const rgba = button.rgba;
            const hex = this._rgbaToHex(rgba);
            settings.set_string(key, hex);
        });
        return btn;
    }

    _hexToRgba(hex) {
        const rgba = new Gdk.RGBA();
        rgba.parse(hex);
        return rgba;
    }

    _rgbaToHex(rgba) {
        const r = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
        const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
        const b = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
}
