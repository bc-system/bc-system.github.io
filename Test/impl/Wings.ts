/// <reference path="./Part.ts" />
/// <reference path="./Stats.ts" />

type WingType_OLD = {
    surface: number, area: number, span: number,
    dihedral: number, anhedral: number, deck: number
};
type WingType = {
    surface: number, area: number, span: number,
    dihedral: number, anhedral: number,
    gull: boolean, deck: number
};
enum WING_DECK {
    PARASOL,
    SHOULDER,
    MID,
    LOW,
    GEAR,
};
class Wings extends Part {
    //Possible selections
    private wing_list: WingType[];
    private mini_wing_list: WingType[];
    private stagger_list: {
        name: string, inline: boolean,
        wing_count: number, hstab: boolean, stats: Stats,
    }[];
    private skin_list: {
        name: string, flammable: boolean,
        stats: Stats, strainfactor: number,
        dragfactor: number, metal: boolean,
        transparent: boolean,
    }[];
    private deck_list: {
        name: string, limited: boolean,
        stats: Stats,
    }[];
    private long_list: {
        dragfactor: number, stats: Stats,
    }[];
    //Actual selections
    private wing_stagger: number;
    private is_swept: boolean;
    private is_closed: boolean;
    private plane_mass: number;
    private acft_type: AIRCRAFT_TYPE;
    private rotor_span: number;

    constructor(js: JSON) {
        super();

        this.skin_list = [];
        for (let elem of js["surface"]) {
            this.skin_list.push({
                name: elem["name"], flammable: elem["flammable"],
                stats: new Stats(elem), strainfactor: elem["strainfactor"],
                dragfactor: elem["dragfactor"], metal: elem["metal"],
                transparent: elem["transparent"],
            });
        }

        this.stagger_list = [];
        for (let elem of js["stagger"]) {
            this.stagger_list.push({
                name: elem["name"], inline: elem["inline"],
                wing_count: elem["wing_count"], hstab: elem["hstab"], stats: new Stats(elem),
            });
        }

        this.deck_list = [];
        for (let elem of js["decks"]) {
            this.deck_list.push({
                name: elem["name"], limited: elem["limited"], stats: new Stats(elem),
            });
        }

        this.long_list = [];
        for (let elem of js["largest"]) {
            this.long_list.push({ dragfactor: elem["dragfactor"], stats: new Stats(elem), });
        }

        this.wing_list = [];
        this.mini_wing_list = [];

        this.wing_stagger = Math.floor(1.0e-6 + this.stagger_list.length / 2);
        this.is_swept = false;
        this.is_closed = false;
        this.rotor_span = 0;
    }

    public toJSON() {
        return {
            wing_list: this.wing_list,
            mini_wing_list: this.mini_wing_list,
            wing_stagger: this.wing_stagger,
            is_swept: this.is_swept,
            is_closed: this.is_closed
        };
    }

    public fromJSON(js: JSON, json_version: number) {
        if (json_version > 11.15) {
            this.wing_list = js["wing_list"];
            this.mini_wing_list = js["mini_wing_list"];
        } else {
            var wl = js["wing_list"];
            this.wing_list = this.OldtoNew(wl);
            var mwl = js["mini_wing_list"];
            this.mini_wing_list = this.OldtoNew(mwl);
        }
        this.wing_stagger = js["wing_stagger"];
        this.is_swept = js["is_swept"];
        this.is_closed = js["is_closed"];
    }

    private OldtoNew(wtl: WingType_OLD[]): WingType[] {
        var list = [] as WingType[];
        for (let wt of wtl) {
            list.push({
                surface: wt.surface, area: wt.area, span: wt.span, anhedral: wt.anhedral,
                dihedral: wt.dihedral, gull: false, deck: wt.deck
            });
        }
        return list;
    }

    public serialize(s: Serialize) {
        s.PushNum(this.wing_list.length);
        for (let i = 0; i < this.wing_list.length; i++) {
            var w = this.wing_list[i];
            s.PushNum(w.surface);
            s.PushNum(w.area);
            s.PushNum(w.span);
            s.PushNum(w.dihedral);
            s.PushNum(w.anhedral);
            s.PushBool(w.gull);
            s.PushNum(w.deck);
        }
        s.PushNum(this.mini_wing_list.length);
        for (let i = 0; i < this.mini_wing_list.length; i++) {
            var w = this.mini_wing_list[i];
            s.PushNum(w.surface);
            s.PushNum(w.area);
            s.PushNum(w.span);
            s.PushNum(w.dihedral);
            s.PushNum(w.anhedral);
            s.PushBool(w.gull);
            s.PushNum(w.deck);
        }
        s.PushNum(this.wing_stagger);
        s.PushBool(this.is_swept);
        s.PushBool(this.is_closed);
    }

    public deserialize(d: Deserialize) {
        var wlen = d.GetNum();
        this.wing_list = [];
        for (let i = 0; i < wlen; i++) {
            let wing = { surface: 0, area: 0, span: 0, anhedral: 0, dihedral: 0, gull: false, deck: 0 };
            wing.surface = d.GetNum();
            wing.area = d.GetNum();
            wing.span = d.GetNum();
            if (d.version > 11.15) {
                wing.dihedral = d.GetNum();
                wing.anhedral = d.GetNum();
                wing.gull = d.GetBool();
            } else {
                wing.dihedral = d.GetNum();
                wing.anhedral = d.GetNum();
                wing.gull = false;
            }
            wing.deck = d.GetNum();
            this.wing_list.push(wing);
        }
        var mlen = d.GetNum();
        this.mini_wing_list = [];
        for (let i = 0; i < mlen; i++) {
            let wing = { surface: 0, area: 0, span: 0, anhedral: 0, dihedral: 0, gull: false, deck: 0 };
            wing.surface = d.GetNum();
            wing.area = d.GetNum();
            wing.span = d.GetNum();
            if (d.version > 11.15) {
                wing.dihedral = d.GetNum();
                wing.anhedral = d.GetNum();
                wing.gull = d.GetBool();
            } else {
                wing.dihedral = d.GetNum();
                wing.anhedral = d.GetNum();
                wing.gull = false;
            }
            wing.deck = d.GetNum();
            this.mini_wing_list.push(wing);
        }
        this.wing_stagger = d.GetNum();
        this.is_swept = d.GetBool();
        this.is_closed = d.GetBool();
    }

    public SetRotorSpan(s: number) {
        this.rotor_span = s;
    }

    public GetWingList() {
        return this.wing_list;
    }

    public GetMiniWingList() {
        return this.mini_wing_list;
    }

    public GetSkinList() {
        return this.skin_list;
    }

    public GetStaggerList() {
        return this.stagger_list;
    }

    public GetDeckList() {
        return this.deck_list;
    }

    private DeckCountFull() {
        var count = [...Array(this.deck_list.length).fill(0)];
        for (let w of this.wing_list) {
            count[w.deck]++;
        }
        return count;
    }

    private DeckCountMini() {
        var count = [...Array(this.deck_list.length).fill(0)];
        for (let w of this.mini_wing_list) {
            count[w.deck]++;
        }
        return count;
    }

    public CanStagger() {
        var can = [...Array(this.stagger_list.length).fill(false)];
        if (this.acft_type == AIRCRAFT_TYPE.ORNITHOPTER_FLUTTER) {
            if (this.wing_list.length > 1)
                can[1] = true;
            else
                can[0] = true;
        } else {
            if (this.wing_list.length > 1) {
                for (let i = 1; i < this.stagger_list.length; i++)
                    can[i] = true;
            }
            if (this.wing_list.length == 1) {
                can[0] = true;
            }
        }
        return can;
    }

    public SetAcftType(type: AIRCRAFT_TYPE) {
        this.acft_type = type;
        if (type == AIRCRAFT_TYPE.ORNITHOPTER_FLUTTER) {
            if (this.wing_list.length > 1)
                this.wing_stagger = 1;
            else
                this.wing_stagger = 0;
        }
    }

    public SetStagger(index: number) {
        this.wing_stagger = index;
        while (this.stagger_list[index].wing_count < this.wing_list.length) {
            this.wing_list.pop();
        }
        if (!this.stagger_list[index].inline) {
            var count = this.DeckCountFull();
            for (let i = this.wing_list.length - 1; i >= 0; i--) {
                let w = this.wing_list[i];
                if (count[w.deck] > 1) {
                    count[w.deck]--;
                    this.wing_list.splice(i, 1);
                }
            }
        }

        this.CalculateStats();
    }

    public GetStagger() {
        if (this.wing_list.length > 0) {
            return this.wing_stagger;
        } else {
            return -1;
        }
    }

    public CanAddFullWing(deck: number) {
        if (deck >= this.deck_list.length)
            console.log("Deck out of Bounds");
        // if (this.wing_list.length >= this.stagger_list[this.wing_stagger].wing_count)
        //     return false;

        if (!this.stagger_list[this.wing_stagger].inline) {//If not tandem...
            //No shoulder with gull parasol
            if (deck == WING_DECK.SHOULDER && this.HasPolishWing())
                return false;

            //Limited numbers of each deck
            var full_count = this.DeckCountFull();
            if (full_count[deck] == WING_DECK.SHOULDER && this.deck_list[deck].limited)
                return false
        }

        var mini_count = this.DeckCountMini();
        if (mini_count[deck] != 0)
            return false;

        return true;
    }

    public CanAddMiniWing(deck: number) {
        var full_count = this.DeckCountFull();
        var mini_count = this.DeckCountMini();
        if (full_count[deck] != 0 || mini_count[deck] != 0)
            return false;
        return true;
    }

    public CanMoveFullWing(idx: number, deck: number) {
        var w = this.wing_list[idx];
        this.wing_list.splice(idx, 1);
        var can = this.CanAddFullWing(deck);
        this.wing_list.splice(idx, 0, w);
        return can;
    }

    public CanMoveMiniWing(idx: number, deck: number) {
        var w = this.mini_wing_list[idx];
        this.mini_wing_list.splice(idx, 1);
        var can = this.CanAddMiniWing(deck);
        this.mini_wing_list.splice(idx, 0, w);
        return can;
    }

    public GetWingHeight() {
        var max = 0;
        for (let w of this.wing_list)
            max = Math.max(max, 4 - w.deck);
        return max;
    }

    public CanClosed() {
        return this.wing_list.length > 1;
    }

    public SetClosed(use: boolean) {
        if (this.wing_list.length > 0)
            this.is_closed = use;
        else
            this.is_closed = false;

        this.CalculateStats();
    }

    public GetClosed() {
        return this.is_closed;
    }

    public CanSwept() {
        return this.wing_list.length > 0;
    }

    public SetSwept(use: boolean) {
        if (this.wing_list.length > 0)
            this.is_swept = use;
        else
            this.is_swept = false;

        this.CalculateStats();
    }

    public GetSwept() {
        return this.is_swept;
    }

    public GetTandem() {
        return this.stagger_list[this.wing_stagger].inline && this.wing_list.length > 1;
    }

    public GetMonoplane() {
        return this.wing_list.length == 1;
    }

    public GetStaggered() {
        return this.stagger_list[this.wing_stagger].stats.liftbleed != 0;
    }

    public SetFullWing(idx: number, w: WingType) {
        if (this.wing_list.length != idx) {
            this.wing_list.splice(idx, 1);
        }

        if (w.area != w.area)
            w.area = 3;
        w.area = Math.floor(1.0e-6 + w.area);
        if (w.span != w.span)
            w.span = 1;
        w.span = Math.floor(1.0e-6 + w.span);

        if (w.deck >= 0) {
            w.area = Math.max(w.area, 3);
            w.span = Math.max(w.span, 1);

            if (this.CanAddFullWing(w.deck))
                this.wing_list.splice(idx, 0, w);
        }

        if (this.wing_list.length > 1 && this.wing_stagger == 0)
            this.wing_stagger = 4;
        else if (this.wing_list.length <= 1)
            this.wing_stagger = 0;

        this.CalculateStats();
    }

    public SetMiniWing(idx: number, w: WingType) {
        if (this.mini_wing_list.length != idx)
            this.mini_wing_list.splice(idx, 1);

        if (w.area != w.area)
            w.area = 2;
        w.area = Math.floor(1.0e-6 + w.area);
        if (w.span != w.span)
            w.span = 1;
        w.span = Math.floor(1.0e-6 + w.span);

        if (w.deck >= 0) {
            w.area = Math.max(w.area, 1);
            w.area = Math.min(w.area, 2);
            w.span = Math.max(w.span, 1);

            if (this.CanAddMiniWing(w.deck))
                this.mini_wing_list.splice(idx, 0, w);
        }

        this.CalculateStats();
    }

    private HasNonGullDeck(deck: number) {
        for (let w of this.wing_list) {
            if (w.deck == deck && !w.gull)//If we have shoulder...
                return true;
        }
        return false;
    }

    public CanGull(deck: number) {
        if (deck == WING_DECK.PARASOL) {
            if (!this.GetTandem() && this.HasNonGullDeck(WING_DECK.SHOULDER))
                return false;
        } else if (deck == WING_DECK.SHOULDER) {
            return false;
        } else {
            if (!this.GetTandem() && this.HasNonGullDeck(deck - 1))
                return false;
        }
        return true;
    }

    public IsFlammable() {
        for (let w of this.wing_list) {
            if (this.skin_list[w.surface].flammable)
                return true;
        }
        for (let w of this.mini_wing_list) {
            if (this.skin_list[w.surface].flammable)
                return true;
        }
        return false;
    }

    public NeedHStab() {
        return this.stagger_list[this.wing_stagger].hstab;
    }

    public NeedTail() {
        return this.NeedHStab() || !this.is_swept;
    }

    public GetSpan() {
        var longest_span = 0;
        for (let w of this.wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            let wspan = w.span;
            longest_span = Math.max(longest_span, wspan);
        }
        for (let w of this.mini_wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            let wspan = w.span;
            longest_span = Math.max(longest_span, wspan);
        }
        return longest_span;
    }

    public GetArea() {
        var area = 0;
        for (let w of this.wing_list) {
            area += w.area;
        }
        for (let w of this.mini_wing_list) {
            area += w.area;
        }
        return area;
    }

    public GetParasol() {
        for (let w of this.wing_list) {
            if (w.deck == WING_DECK.PARASOL) {
                return true;
            }
        }
        for (let w of this.mini_wing_list) {
            if (w.deck == WING_DECK.PARASOL) {
                return true;
            }
        }
        return false;
    }

    public GetMetalArea() {
        var area = 0;
        for (let w of this.wing_list) {
            if (this.skin_list[w.surface].metal)
                area += w.area;
        }
        for (let w of this.mini_wing_list) {
            if (this.skin_list[w.surface].metal)
                area += w.area;
        }
        return area;
    }

    public GetWingDrag() {
        var drag = 0;
        var deck_count = this.DeckCountFull();
        var longest_span = 0;
        var longest_drag = 0;
        for (let w of this.wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            let wspan = w.span;
            let warea = w.area;
            longest_span = Math.max(longest_span, wspan);

            if (w.gull)
                warea = Math.floor(1.0e-6 + 1.1 * warea);

            var wdrag = Math.max(1, 6 * warea * warea / (wspan * wspan));
            wdrag = Math.max(1, wdrag * this.skin_list[w.surface].dragfactor);
            //Inline wings
            if (this.stagger_list[this.wing_stagger].inline && deck_count[w.deck] > 1) {
                wdrag = Math.floor(1.0e-6 + 0.75 * wdrag);
                wdrag = Math.max(1, wdrag);
            }
            wdrag = Math.floor(1.0e-6 + wdrag);
            if (longest_span == wspan)
                longest_drag = longest_drag;
            drag += wdrag;
        }
        for (let w of this.mini_wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            let wspan = w.span;

            //Drag is modified by area, span
            var wdrag = Math.max(1, 6 * w.area * w.area / (wspan * wspan));
            wdrag = Math.max(1, wdrag * this.skin_list[w.surface].dragfactor);
            wdrag = Math.floor(1.0e-6 + wdrag);
            drag += wdrag;
        }
        //Sesquiplanes!
        var sesp = this.GetIsSesquiplane();
        if ((sesp.is || this.GetMonoplane()) && sesp.deck != -1) {
            drag -= Math.floor(1.0e-6 + (1 - this.long_list[sesp.deck].dragfactor) * longest_drag);
        }
        return drag;
    }

    public GetIsFlammable(): boolean {
        for (let s of this.wing_list) {
            if (this.skin_list[s.surface].flammable)
                return true;
        }
        for (let s of this.mini_wing_list) {
            if (this.skin_list[s.surface].flammable)
                return true;
        }
        return false;
    }

    public SetAircraftMass(plane_mass: number) {
        this.plane_mass = plane_mass;
    }

    public GetPaperMass(): number {
        var paper = 0;
        for (let w of this.wing_list) {
            var wStats = this.skin_list[w.surface].stats.Multiply(w.area);
            wStats.Round();
            if (wStats.mass < 0)
                paper += wStats.mass;
        }
        for (let w of this.mini_wing_list) {
            var wStats = this.skin_list[w.surface].stats.Multiply(w.area);
            wStats.Round();
            if (wStats.mass < 0)
                paper += wStats.mass;
        }

        return Math.max(-Math.floor(1.0e-6 + 0.25 * this.plane_mass), paper);
    }

    public GetIsSesquiplane(): { is: boolean, deck: number, super_small: boolean } {
        var biggest_area = 0;
        var biggest_deck = -1;
        var biggest_span = 0;
        var smallest_area = 1e100;
        var smallest_span = 0;

        for (let w of this.wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            if (w.area > biggest_area) {
                biggest_area = w.area;
                biggest_deck = w.deck;
                biggest_span = w.span;
            } else if (w.area == biggest_area) {
                biggest_deck = -1;
            }
            if (smallest_area > w.area) {
                smallest_area = w.area;
                smallest_span = w.span;
            }
        }

        var is = biggest_area >= 2 * smallest_area;
        is = is && !this.GetMonoplane() && !this.GetTandem();

        if (is) {
            var ss = 0.75 * biggest_span >= smallest_span;
            return { is: is, deck: biggest_deck, super_small: ss };
        }
        return { is: false, deck: biggest_deck, super_small: false };
    }

    private HasPolishWing(): boolean {
        for (let w of this.wing_list) {
            if (w.deck == WING_DECK.PARASOL && w.gull == true) {
                return true;
            }
        }
        return false;
    }

    public HasInvertedGull(): number {
        var ret = -1;
        for (let w of this.wing_list) {
            if (w.gull && w.deck > WING_DECK.SHOULDER) {
                ret = Math.max(ret, w.deck);
            }
        }
        return ret;
    }

    public PartStats() {
        if (!this.CanClosed())
            this.is_closed = false;
        if (!this.CanSwept())
            this.is_swept = false;

        var stats = new Stats();

        var have_wing = false;
        var deck_count = this.DeckCountFull();
        var have_mini_wing = false;
        var longest_span = this.rotor_span;
        var longest_drag = 0;

        for (let w of this.wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            longest_span = Math.max(longest_span, w.span);

            if (!have_wing) { //Is first wing
                have_wing = true;
            }
            else { //Is not first wing
                stats.control += 3;
                stats.liftbleed += 5;
                stats.visibility -= 1;
            }

            var wStats = new Stats();

            //Actual stats
            wStats = wStats.Add(this.skin_list[w.surface].stats.Multiply(w.area));
            wStats.wingarea = w.area;
            //Wings cannot generate positive max strain
            wStats.maxstrain += Math.min(0, -(2 * w.span + w.area - 10));
            //Buzzers double stress
            if (this.acft_type == AIRCRAFT_TYPE.ORNITHOPTER_BUZZER)
                wStats.maxstrain += Math.min(0, -(2 * w.span + w.area - 10));

            wStats.maxstrain *= this.skin_list[w.surface].strainfactor;

            if (this.skin_list[w.surface].transparent) {
                wStats.visibility += 1;
            }

            //Drag is modified by area, span, and the leading wing
            let wspan = w.span;
            //Gull Drag modifies wing area
            let warea = w.area;
            if (w.gull)
                warea = Math.floor(1.0e-6 + 1.1 * warea);

            var wdrag = Math.max(1, 6 * warea * warea / (wspan * wspan));
            wStats.drag = wStats.drag + wdrag;
            wStats.drag = Math.max(1, wStats.drag * this.skin_list[w.surface].dragfactor);

            //Inline wings
            if (this.stagger_list[this.wing_stagger].inline && deck_count[w.deck] > 1) {
                wStats.drag = Math.floor(1.0e-6 + 0.75 * wStats.drag);
                wStats.drag = Math.max(1, wStats.drag);
            }

            //Deck Effects
            stats = stats.Add(this.deck_list[w.deck].stats);

            //stability from -hedral
            wStats.latstab += w.dihedral - w.anhedral;
            wStats.liftbleed += w.dihedral + w.anhedral;

            wStats.Round();

            //Save for Longest Wing Mid bonus later
            if (longest_span == w.span) {
                longest_drag = wStats.drag;
            }

            if (wStats.mass < 0) //Treated paper is applied later
                wStats.mass = 0;
            stats = stats.Add(wStats);
        }
        for (let w of this.mini_wing_list) {
            //Longest span is span - (1/2 liftbleed of anhedral and dihedral)
            longest_span = Math.max(longest_span, w.span);

            stats.control += 1;
            if (!have_mini_wing) { //Is first miniature wing
                have_mini_wing = true;
            }
            else {//Is not first miniature wing
                stats.liftbleed += 1;
            }

            //Actual stats
            var wStats = this.skin_list[w.surface].stats.Multiply(w.area);
            wStats.wingarea = w.area;
            wStats.maxstrain += Math.min(0, -(2 * w.span + w.area - 10));
            wStats.maxstrain *= this.skin_list[w.surface].strainfactor;
            //Drag is modified by area, span
            let wspan = w.span;
            wStats.drag = Math.max(1, wStats.drag + 6 * w.area * w.area / (wspan * wspan));
            wStats.drag = Math.max(1, wStats.drag * this.skin_list[w.surface].dragfactor);

            //stability from -hedral
            wStats.latstab += w.dihedral - w.anhedral;
            wStats.liftbleed += w.dihedral + w.anhedral;

            wStats.Round();
            if (wStats.mass < 0) //Treated paper is applied later
                wStats.mass = 0;
            stats = stats.Add(wStats);
        }

        //Longest wing effects
        stats.control += 8 - longest_span;
        stats.latstab += Math.min(0, longest_span - 8);

        //Sesquiplanes!
        var sesp = this.GetIsSesquiplane();
        if ((sesp.is || this.GetMonoplane()) && sesp.deck != -1) {
            stats = stats.Add(this.long_list[sesp.deck].stats);
            stats.drag -= Math.floor(1.0e-6 + (1 - this.long_list[sesp.deck].dragfactor) * longest_drag);
        }

        if (sesp.is) {
            stats.liftbleed -= 2;
            stats.control += 2;
        }

        //Inline Wing Shadowing
        if (this.stagger_list[this.wing_stagger].inline) {
            for (let count of deck_count) {
                if (count > 1) {
                    stats.liftbleed += (count - 1) * 3;
                }
            }
        }

        //Gull wing effects (wing bits, drag is already applied)
        if (this.HasPolishWing()) {
            stats.visibility += 1;
            stats.maxstrain += 10;
        }
        switch (this.HasInvertedGull()) {
            case 1: //Shoulder Wing
                //Can't be gull.
                break;
            case 2: //Mid wing
            case 3: //Low wing (same as Mid)
                //Only affects landing gear and bomb capacity
                break;
            case 4: //Gear wing
                stats.maxstrain += 10;
                stats.crashsafety += 1;
                //Also affects landing gear and bomb capacity
                break;
            default:
            //NOTHING...
        }
        if (this.HasInvertedGull() > 0 || this.HasPolishWing()) {
            stats.era.push({ name: "Gull Wing", era: "Coming Storm" });
        }

        //Wing Sweep effects
        if (this.is_swept) {
            stats.liftbleed += 5;
            stats.latstab--;
        }

        //Closed Wing effects
        if (this.is_closed) {
            var pairs = Math.floor(1.0e-6 + this.wing_list.length / 2.0);
            stats.mass += 1 * pairs;
            stats.control -= 5 * pairs;
            stats.maxstrain += 20 * pairs;
        }

        //Stagger effects, monoplane is nothing.
        if (this.wing_list.length > 1) {
            stats = stats.Add(this.stagger_list[this.wing_stagger].stats);
        }

        return stats;
    }

    public SetCalculateStats(callback: () => void) {
        this.CalculateStats = callback;
    }
}