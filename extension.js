import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const TICKER = 'STRC';
const YAHOO_URL = `https://query1.finance.yahoo.com/v8/finance/chart/${TICKER}?interval=1d&range=1d`;

export default class StrcPricePanel extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._indicator = new PanelMenu.Button(0.0, 'STRC Price Panel', false);

        this._label = new St.Label({
            text: 'STRC --',
            y_align: St.Align.MIDDLE,
            style_class: 'strc-price-panel-label',
        });
        this._indicator.add_child(this._label);

        // Add to the right side of the top panel (after the clock area).
        Main.panel.addToStatusArea('strc-price-panel', this._indicator, 0, 'right');

        // Apply user stylesheet so our color classes take effect.
        Main.panel.add_style_class_name('strc-price-panel-label');

        // Track settings changes.
        this._settingsSignalId = this._settings.connect('changed', () => {
            this._refresh();
        });

        // Initial fetch.
        this._refresh();

        // Schedule recurring fetch based on the configured interval.
        this._scheduleRefresh();
    }

    disable() {
        if(this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._settingsSignalId) {
            this._settings.disconnect(this._settingsSignalId);
            this._settingsSignalId = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
        this._label = null;
        this._settings = null;
        this._lastPrice = null;
    }

    _scheduleRefresh() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        const seconds = Math.max(10, this._settings.get_int('refresh-interval'));
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            seconds,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _refresh() {
        this._fetchPrice()
            .then(({ price, prev }) => {
                const arrow = this._settings.get_boolean('show-arrow')
                    ? this._arrowFor(price, prev)
                    : '';
                const sign = price >= prev ? '+' : '';
                const change = prev ? `${sign}${(price - prev).toFixed(2)}` : '';
                this._label.set_text(`STRC $${price.toFixed(2)} ${change} ${arrow}`.trim());

                // Color class based on movement.
                this._label.remove_style_class_name('up');
                this._label.remove_style_class_name('down');
                this._label.remove_style_class_name('neutral');
                if (prev) {
                    if (price > prev) this._label.add_style_class_name('up');
                    else if (price < prev) this._label.add_style_class_name('down');
                    else this._label.add_style_class_name('neutral');
                }

                this._lastPrice = price;
            })
            .catch((err) => {
                console.error(`[strc-price-panel] fetch failed: ${err.message}`);
                this._label.set_text('STRC ??');
                this._label.remove_style_class_name('up');
                this._label.remove_style_class_name('down');
                this._label.add_style_class_name('neutral');
            });
    }

    _arrowFor(price, prev) {
        if (prev === null || prev === undefined) return '';
        if (price > prev) return '▲';
        if (price < prev) return '▼';
        return '–';
    }

    async _fetchPrice() {
        const prev = this._lastPrice ?? null;

        const result = await new Promise((resolve, reject) => {
            const session = new Gio.Session();
            const msg = Gio.URI.request_new(YAHOO_URL);
            // Yahoo's v8 endpoint requires a User-Agent header.
            msg.set_headers(
                'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            );

            session.send_and_read_async(
                msg,
                GLib.PRIORITY_DEFAULT,
                null,
                (source, res) => {
                    try {
                        const bytes = session.send_and_read_finish(res);
                        const text = new TextDecoder().decode(bytes);
                        resolve(JSON.parse(text));
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });

        const meta = result?.chart?.result?.[0]?.meta;
        if (!meta) {
            throw new Error('No price data in response');
        }

        const price = meta.regularMarketPrice;
        if (typeof price !== 'number') {
            throw new Error('Invalid price value');
        }

        return { price, prev };
    }
}
