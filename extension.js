import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class StrcPricePanel extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._indicator = new PanelMenu.Button(0.0, 'Price Panel', false);

        this._label = new St.Label({
            text: '--',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'strc-price-panel-label',
        });
        this._indicator.add_child(this._label);

        const position = this._settings.get_string('position');
        Main.panel.addToStatusArea(
            'strc-price-panel',
            this._indicator,
            this._settings.get_int('panel-order'),
            position
        );

        this._applyStyle();
        this._refresh();

        this._settingsSignalId = this._settings.connect('changed', () => {
            this._applyStyle();
            this._scheduleRefresh();
            this._refresh();
        });

        this._scheduleRefresh();
    }

    disable() {
        if (this._timeoutId) {
            GLib.source.remove(this._timeoutId);
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
            GLib.source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        const value = Math.max(1, this._settings.get_int('refresh-interval'));
        const unit = this._settings.get_string('refresh-unit');
        const multipliers = { min: 60, hour: 3600, day: 86400, week: 604800 };
        const seconds = value * (multipliers[unit] || 60);
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            seconds,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _applyStyle() {
        const fontSize = this._settings.get_int('font-size');
        this._label.set_style(`font-size: ${fontSize}%; font-weight: normal;`);
    }

    _refresh() {
        this._fetchPrice()
            .then(({ price, prev }) => {
                const ticker = this._settings.get_string('ticker').toUpperCase();
                const prefix = this._settings.get_string('prefix');
                const decimals = this._settings.get_int('decimal-places');
                const showArrow = this._settings.get_boolean('show-arrow');
                const showChange = this._settings.get_boolean('show-change');
                const showPercent = this._settings.get_boolean('show-percent');

                let text = `${ticker} ${prefix}${price.toFixed(decimals)}`;

                if (showChange && prev !== null && prev !== undefined) {
                    const delta = price - prev;
                    const sign = delta >= 0 ? '+' : '';
                    text += ` ${sign}${prefix}${delta.toFixed(decimals)}`;
                }

                if (showPercent && prev !== null && prev !== undefined && prev !== 0) {
                    const pct = ((price - prev) / prev) * 100;
                    const sign = pct >= 0 ? '+' : '';
                    text += ` (${sign}${pct.toFixed(2)}%)`;
                }

                if (showArrow) {
                    text += ` ${this._arrowFor(price, prev)}`;
                }

                this._label.set_text(text.trim());

                const colorUp = this._settings.get_string('color-up');
                const colorDown = this._settings.get_string('color-down');
                const colorNeutral = this._settings.get_string('color-neutral');
                const textColor = this._settings.get_string('text-color');
                const fontSize = this._settings.get_int('font-size');

                if (prev !== null && prev !== undefined) {
                    if (price > prev) this._label.set_style(`color: ${colorUp}; font-size: ${fontSize}%; font-weight: normal;`);
                    else if (price < prev) this._label.set_style(`color: ${colorDown}; font-size: ${fontSize}%; font-weight: normal;`);
                    else this._label.set_style(`color: ${colorNeutral}; font-size: ${fontSize}%; font-weight: normal;`);
                } else {
                    this._label.set_style(`color: ${textColor}; font-size: ${fontSize}%; font-weight: normal;`);
                }

                this._lastPrice = price;
            })
            .catch((err) => {
                console.error(`[strc-price-panel] fetch failed: ${err.message}`);
                const ticker = this._settings.get_string('ticker').toUpperCase();
                this._label.set_text(`${ticker} ??`);
                const textColor = this._settings.get_string('text-color');
                const fontSize = this._settings.get_int('font-size');
                this._label.set_style(`color: ${textColor}; font-size: ${fontSize}%; font-weight: normal;`);
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
        const ticker = this._settings.get_string('ticker').toUpperCase();
        const source = this._settings.get_string('data-source');

        let url;
        if (source === 'finnhub') {
            const apiKey = this._settings.get_string('finnhub-api-key');
            if (!apiKey) throw new Error('Finnhub API key is required');
            url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
        } else if (source === 'custom') {
            url = this._settings.get_string('custom-url');
            if (!url) throw new Error('Custom URL is required');
        } else {
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        }

        const result = await this._httpGet(url);
        const price = this._parsePrice(source, result);

        if (typeof price !== 'number' || isNaN(price)) {
            throw new Error('Invalid price value');
        }

        return { price, prev };
    }

    _parsePrice(source, json) {
        if (source === 'finnhub') {
            return json.c;
        }
        if (source === 'custom') {
            return parseFloat(json.price);
        }
        return json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    }

    _httpGet(url) {
        return new Promise((resolve, reject) => {
            const session = new Soup.Session();
            const msg = Soup.Message.new('GET', url);
            session.user_agent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';

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
    }
}
