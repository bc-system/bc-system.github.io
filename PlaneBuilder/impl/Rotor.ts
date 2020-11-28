/// <reference path="./Part.ts" />
/// <reference path="./Stats.ts" />

enum AIRCRAFT_TYPE {
    AIRPLANE,
    HELICOPTER,
    AUTOGYRO
}
class Rotor extends Part {
    private type: AIRCRAFT_TYPE;
    private rotor_count: number;
    private rotor_span: number;
    private wing_area: number;
    private is_tandem: boolean;
    private rotor_pitch: number;
    private dryMP: number;
    private sizing_span: number;
    private accessory: boolean;

    private cant_idx: number;
    private cant_list: { name: string, limited: boolean, stats: Stats }[];

    constructor() {
        super();
        this.type = AIRCRAFT_TYPE.AIRPLANE;
        this.rotor_count = 0;
        this.rotor_span = 0;
        this.wing_area = 0;
        this.is_tandem = false;
        this.rotor_pitch = -1;
        this.dryMP = 0;
        this.sizing_span = 0;
        this.cant_idx = 0;
        this.accessory = false;
    }

    public toJSON() {
        return {
            type: this.type,
            rotor_count: this.rotor_count,
            rotor_span: this.rotor_span,
            rotor_mat: this.cant_idx,
            is_tandem: this.is_tandem,
            accessory: this.accessory,
        };
    }

    public fromJSON(js: JSON, json_version: number) {
        this.type = js["type"];
        this.rotor_count = js["rotor_count"];
        this.rotor_span = js["rotor_span"];
        this.cant_idx = js["rotor_mat"];
        this.is_tandem = js["is_tandem"];
        this.accessory = js["accessory"];
    }

    public serialize(s: Serialize) {
        s.PushNum(this.type);
        s.PushNum(this.rotor_count);
        s.PushNum(this.rotor_span);
        s.PushNum(this.cant_idx);
        s.PushBool(this.is_tandem);
        s.PushBool(this.accessory);
    }

    public deserialise(d: Deserialize) {
        this.type = d.GetNum();
        this.rotor_count = d.GetNum();
        this.rotor_span = d.GetNum();
        this.cant_idx = d.GetNum();
        this.is_tandem = d.GetBool();
        this.accessory = d.GetBool();
    }

    public SetCantileverList(cant_list: { name: string, limited: boolean, stats: Stats }[]) {
        this.cant_list = cant_list;
    }

    public GetCantileverList() {
        return this.cant_list;
    }

    public SetCantilever(num: number) {
        this.cant_idx = num;
    }

    public GetCantilever() {
        return this.cant_idx;
    }

    public SetType(new_type: AIRCRAFT_TYPE) {
        if (this.type != new_type) {
            this.accessory = false;
            this.cant_idx = 0;
            this.is_tandem = false;
            this.rotor_count = 1;
        }
        this.type = new_type;
        this.VerifySizes();
    }

    public CanRotorCount() {
        return this.type == AIRCRAFT_TYPE.HELICOPTER;
    }

    public SetRotorCount(num: number) {
        if (num < 1)
            num = 1;
        if (num >= 2) {
            if (num % 2 == 1) {
                if (num == this.rotor_count + 1) {
                    num = num + 1;
                } else {
                    num = num - 1;
                }
            }
        }
        this.rotor_count = num;
        this.CalculateStats();
    }

    public GetRotorCount() {
        return this.rotor_count;
    }

    public CanRotorSpan() {
        return this.type == AIRCRAFT_TYPE.HELICOPTER;
    }

    public SetRotorSpan(num: number) {
        this.rotor_span = num;
        this.CalculateStats();
    }

    public GetRotorSpan() {
        return this.rotor_span;
    }

    public CanTandem() {
        return this.type == AIRCRAFT_TYPE.HELICOPTER && this.rotor_count > 1;
    }

    public SetTandem(tan: boolean) {
        this.is_tandem = tan;
        this.CalculateStats();
    }

    public GetTandem() {
        return this.is_tandem;
    }

    public SetPitch(pit: number) {
        this.rotor_pitch = pit;
        this.VerifySizes();
    }

    public SetWingArea(num: number) {
        this.wing_area = num;
        this.VerifySizes();
    }

    public GetSizingSpan() {
        return this.sizing_span;
    }

    public SetMP(mp: number) {
        if (mp != this.dryMP) {
            this.dryMP = mp;
            this.VerifySizes();
            this.CalculateStats();
        }
    }

    private GetRotorStrain() {
        var area = (Math.PI / 8) * this.rotor_span * this.rotor_span;
        return this.rotor_count * Math.max(1, 2 * this.rotor_span + area - 10);
    }

    public GetRotorDrag() {
        if (this.type != AIRCRAFT_TYPE.AIRPLANE) {
            var area = (Math.PI / 8) * this.rotor_span * this.rotor_span;
            if (this.rotor_count == 1) {
                return Math.floor(1.0e-6 + 6 * area * area / (this.rotor_span * this.rotor_span));
            } else {
                return Math.floor(1.0e-6 + 0.75 * this.rotor_count * Math.floor(1.0e-6 + 6 * area * area / (this.rotor_span * this.rotor_span)));
            }
        }
        return 0;
    }

    public GetType() {
        return this.type;
    }

    public GetAccessory() {
        return this.accessory;
    }

    public SetAccessory(use: boolean) {
        this.accessory = use;
        this.CalculateStats();
    }

    private PitchSizing() {
        switch (this.rotor_pitch) {
            case 1:
                return 1.1;
            case 2:
                return 1.05;
            case 3:
                return 1;
            case 4:
                return 0.95;
            case 5:
                return 0.9;
            default:
                return 1000;
        }
    }

    private VerifySizes() {
        if (this.type == AIRCRAFT_TYPE.AIRPLANE) {
            this.rotor_count = 0;
            this.rotor_span = 0;
            this.is_tandem = false;
        } else if (this.type == AIRCRAFT_TYPE.AUTOGYRO) {
            this.rotor_count = 1;
            this.sizing_span = Math.ceil(-1.0e-6 + Math.sqrt((0.6 * this.wing_area) / (Math.PI / 8)));
            this.rotor_span = Math.max(this.rotor_span, this.sizing_span);
            this.is_tandem = false;
            this.rotor_pitch = -1;
        } else if (this.type == AIRCRAFT_TYPE.HELICOPTER) {
            this.rotor_count = Math.max(1, this.rotor_count);
            if (this.rotor_count > 1 && this.rotor_count % 2 == 1)
                this.rotor_count = this.rotor_count - 1;
            if (this.rotor_count == 1) {
                this.sizing_span = Math.ceil(-1.0e-6 + Math.pow(this.dryMP, 1 / 2.5) * 5 * this.PitchSizing());
            } else {
                this.sizing_span = Math.ceil(-1.0e-6 + Math.pow(this.dryMP, 1 / 2.5) * 4 * this.PitchSizing());
            }
        }
    }

    public PartStats() {
        this.VerifySizes();

        var stats = new Stats();
        var area = (Math.PI / 8) * this.rotor_span * this.rotor_span;
        stats.wingarea += area;
        stats.drag = this.GetRotorDrag();

        var strain = this.GetRotorStrain();
        while (strain > 0) {
            let ts = this.cant_list[this.cant_idx].stats.Clone();
            strain -= ts.maxstrain;
            ts.maxstrain = 0;
            ts.toughness = 0;
            stats = stats.Add(ts);
        }

        if (this.is_tandem) {
            stats.pitchstab = 4;
        }

        if (this.type == AIRCRAFT_TYPE.HELICOPTER) {
            stats.reliability = Math.min(0, this.sizing_span - this.rotor_span);
        }

        return stats;
    }

    public SetCalculateStats(callback: () => void) {
        this.CalculateStats = callback;
    }
}