/// <reference path="./Part.ts" />
/// <reference path="./Stats.ts" />
/// <reference path="./EngineStats.ts" />

class Engine extends Part {
    private engine_list: EngineStats[];
    private selected_index: number;
    private etype_stats: EngineStats;

    private cooling_count: number;
    private radiator_index: number;
    private num_radiators: number;

    private mount_list: { name: string, stats: Stats, strainfactor: number, dragfactor: number, pp_type: string, reqED: boolean, reqTail: boolean }[];
    private selected_mount: number;

    private pp_list: { name: string, powerfactor: number }[];
    private use_pp: boolean;
    private torque_to_struct: boolean;

    private use_ds: boolean;
    private gp_count: number;
    private gpr_count: number;

    private cowl_list: { name: string, stats: Stats, ed: number, mpd: number, air: boolean, liquid: boolean, rotary: boolean }[];
    private cowl_sel: number;

    private is_generator: boolean;
    private has_alternator: boolean;

    private total_reliability: number;

    constructor(el: EngineStats[],
        ml: { name: string, stats: Stats, strainfactor: number, dragfactor: number, pp_type: string, reqED: boolean, reqTail: boolean }[],
        ppl: { name: string, powerfactor: number }[],
        cl: { name: string, stats: Stats, ed: number, mpd: number, air: boolean, liquid: boolean, rotary: boolean }[]) {

        super();
        this.engine_list = el;
        this.selected_index = 0;
        this.etype_stats = this.engine_list[0].Clone();

        this.cooling_count = this.etype_stats.stats.cooling;
        this.radiator_index = -1;
        if (this.cooling_count > 0)
            this.radiator_index = 0;
        this.num_radiators = 0;

        this.mount_list = ml;
        this.selected_mount = 0;

        this.pp_list = ppl;
        this.use_pp = false;
        this.torque_to_struct = false;

        this.cowl_list = cl;
        this.cowl_sel = 0;

        this.gp_count = 0;
        this.gpr_count = 0;

        this.total_reliability = 0;

        this.is_generator = false;
        this.has_alternator = false;

        if (el.length <= 0)
            throw "No Engine Stats Found.  Should be at least one.";
    }

    public toJSON() {
        return {
            selected_stats: this.etype_stats.toJSON(),
            cooling_count: this.cooling_count,
            radiator_index: this.radiator_index,
            selected_mount: this.selected_mount,
            use_pushpull: this.use_pp,
            pp_torque_to_struct: this.torque_to_struct,
            use_driveshafts: this.use_ds,
            geared_propeller_ratio: this.gp_count,
            geared_propeller_reliability: this.gpr_count,
            cowl_sel: this.cowl_sel,
            is_generator: this.is_generator,
            has_alternator: this.has_alternator,
        };
    }

    public fromJSON(js: JSON) {
        this.etype_stats.fromJSON(js["selected_stats"]);
        this.cooling_count = js["cooling_count"];
        this.radiator_index = js["radiator_index"];
        this.selected_mount = js["selected_mount"];
        this.use_pp = js["use_pushpull"];
        this.torque_to_struct = js["pp_torque_to_struct"];
        this.use_ds = js["use_driveshafts"];
        this.gp_count = js["geared_propeller_ratio"];
        this.gpr_count = js["geared_propeller_reliability"];
        this.cowl_sel = js["cowl_sel"];
        this.is_generator = js["is_generator"];
        this.has_alternator = js["has_alternator"];
        this.selected_index = -1;
        for (let i = 0; i < this.engine_list.length; i++) {
            if (this.etype_stats.Equal(this.engine_list[i])) {
                this.selected_index = i;
                break;
            }
        }
    }

    public serialize(s: Serialize) {
        this.etype_stats.serialize(s);
        s.PushNum(this.cooling_count);
        s.PushNum(this.radiator_index);
        s.PushNum(this.selected_mount);
        s.PushBool(this.use_pp);
        s.PushBool(this.torque_to_struct);
        s.PushBool(this.use_ds);
        s.PushNum(this.gp_count);
        s.PushNum(this.gpr_count);
        s.PushNum(this.cowl_sel);
        s.PushBool(this.is_generator);
        s.PushBool(this.has_alternator);
    }

    public deserialize(d: Deserialize) {
        this.etype_stats.deserialize(d);
        this.cooling_count = d.GetNum();
        this.radiator_index = d.GetNum();
        this.selected_mount = d.GetNum();
        this.use_pp = d.GetBool();
        this.torque_to_struct = d.GetBool();
        this.use_ds = d.GetBool();
        this.gp_count = d.GetNum();
        this.gpr_count = d.GetNum();
        this.cowl_sel = d.GetNum();
        this.is_generator = d.GetBool();
        this.has_alternator = d.GetBool();
        this.selected_index = -1;
        for (let i = 0; i < this.engine_list.length; i++) {
            if (this.etype_stats.Equal(this.engine_list[i])) {
                this.selected_index = i;
                break;
            }
        }
    }

    public GetMaxAltitude() {
        return this.etype_stats.altitude;
    }

    public SetSelectedIndex(num: number) {
        this.selected_index = num;
        this.etype_stats = this.engine_list[this.selected_index].Clone();
        if (num >= this.engine_list.length)
            throw "Index is out of range of engine_list.";
        this.PulseJetCheck();
        this.VerifyCowl(this.cowl_sel);
        this.cooling_count = this.etype_stats.stats.cooling;
        this.CalculateStats();
    }

    public GetSelectedIndex(): number {
        return this.selected_index;
    }

    public SetCustomStats(stats: EngineStats) {
        this.selected_index = -1;
        if (stats.oiltank) {
            stats.stats.cooling = 0;
        }
        this.etype_stats = stats;
        this.PulseJetCheck();
        this.cooling_count = Math.min(this.cooling_count, this.etype_stats.stats.cooling);
        this.VerifyCowl(this.cowl_sel);
        this.CalculateStats();
    }

    public GetCurrentStats(): EngineStats {
        let stats = new EngineStats();
        stats = stats.Add(this.etype_stats);
        return stats;
    }

    public NeedCooling(): boolean {
        return this.cooling_count > 0;
    }

    public WarnCoolingReliability(): boolean {
        return (this.cooling_count < this.etype_stats.stats.cooling);
    }

    public SetCooling(num: number) {
        if (num != num || num < 0)
            num = 0;
        num = Math.floor(1.0e-6 + num);
        this.cooling_count = num;
        this.CalculateStats();
    }

    public GetCooling(): number {
        return this.cooling_count;
    }

    public GetMaxCooling(): number {
        if (this.use_pp)
            return 2 * this.etype_stats.stats.cooling;
        return this.etype_stats.stats.cooling;
    }

    public SetNumRadiators(num: number) {
        this.num_radiators = num;
        if (this.radiator_index >= num)
            this.radiator_index = num - 1;
        if (this.radiator_index < 0 && num > 0)
            this.radiator_index = 0;
    }

    public GetNumRadiators(): number {
        return this.num_radiators;
    }

    public SetRadiator(num: number) {
        this.radiator_index = num;
        this.CalculateStats();
    }

    public GetRadiator(): number {
        return this.radiator_index;
    }

    public GetListOfEngines(): EngineStats[] {
        return this.engine_list;
    }

    public RequiresExtendedDriveshafts(): boolean {
        return this.mount_list[this.selected_mount].reqED;
    }

    public SetTailMods(forb: boolean, swr: boolean) {
        if (this.mount_list[this.selected_mount].reqTail && !(forb || swr))
            this.use_ds = true;
    }

    public SetMountIndex(num: number) {
        if (num >= this.mount_list.length)
            throw "Index outside of mount_list range.";
        this.selected_mount = num;
        if (this.mount_list[this.selected_mount].reqED)
            this.SetUseExtendedDriveshaft(true);
        this.CalculateStats();
    }

    public GetMountIndex(): number {
        if (this.GetIsPulsejet())
            return -1;
        return this.selected_mount;
    }

    public SetUsePushPull(use: boolean) {
        this.use_pp = use;
        if (use)
            this.cooling_count *= 2;
        else
            this.cooling_count /= 2;
        this.CalculateStats();
    }

    public GetUsePushPull(): boolean {
        return this.use_pp;
    }

    public GetMountList(): { name: string, stats: Stats, strainfactor: number, dragfactor: number, pp_type: string, reqED: boolean, reqTail: boolean }[] {
        return this.mount_list;
    }

    public SetUseExtendedDriveshaft(use: boolean) {
        this.use_ds = use || this.RequiresExtendedDriveshafts();
        this.CalculateStats();
    }

    public GetUseExtendedDriveshaft(): boolean {
        return this.use_ds;
    }

    public SetGearCount(num: number) {
        if (num != num || num < 0)
            num = 0;
        num = Math.floor(1.0e-6 + num);
        this.gp_count = num;
        this.SetGearReliability(this.gpr_count);
    }

    public GetGearCount(): number {
        return this.gp_count;
    }

    public SetGearReliability(num: number) {
        if (num != num || num < 0)
            num = 0;
        num = Math.floor(1.0e-6 + num);
        this.gpr_count = Math.min(num, this.gp_count);
        this.CalculateStats();
    }

    public GetGearReliability(): number {
        return this.gpr_count;
    }

    public SetTorqueToStruct(use: boolean) {
        this.torque_to_struct = use;
        if (!this.use_pp)
            this.torque_to_struct = false;
        this.CalculateStats();
    }

    public GetTorqueToStruct() {
        return this.torque_to_struct;
    }

    public CanTorqueToStruct() {
        return this.use_pp && this.etype_stats.torque > 0 && this.mount_list[this.selected_mount].pp_type == "wing";
    }

    public UpdateReliability(num: number) {
        this.total_reliability = this.etype_stats.stats.reliability;
        this.total_reliability -= (this.gp_count - this.gpr_count);
        if (this.NeedCooling()) {
            this.total_reliability -= (this.GetMaxCooling() - this.cooling_count);
        }
        this.total_reliability += num;
    }

    public GetReliability(): number {
        return this.total_reliability;
    }

    public GetOverspeed(): number {
        return this.etype_stats.overspeed + Math.floor(1.0e-6 + this.gp_count * this.etype_stats.overspeed / 2);
    }

    public GetIsPulsejet(): boolean {
        return this.etype_stats.pulsejet;
    }

    private PulseJetCheck() {
        if (this.GetIsPulsejet()) {
            this.etype_stats.stats.cooling = 0;
            this.etype_stats.overspeed = 100;
            this.etype_stats.altitude = 3;
            this.etype_stats.torque = 0;
            this.use_pp = false;
            this.use_ds = false;
            this.gp_count = 0;
            this.gpr_count = 0;
            this.cooling_count = 0;
            this.has_alternator = false;
            this.is_generator = false;
            if (this.mount_list[this.selected_mount].pp_type == "fuselage") {
                for (let i = 0; i < this.mount_list.length; i++) {
                    this.selected_mount = i;
                    if (this.mount_list[this.selected_mount].pp_type != "fuselage")
                        break;
                }
            }
        }
        else {
            this.etype_stats.rumble = 0;
        }
    }

    public GetHavePropeller() {
        return !this.GetIsPulsejet(); //TODO: Charge and Generators
    }

    public GetIsTractorNacelle() {
        if (!this.GetIsPulsejet()
            && !this.GetUsePushPull()
            && this.mount_list[this.selected_mount].pp_type == "wing")
            return true;
        return false;
    }

    public GetCowlList() {
        return this.cowl_list;
    }

    public GetCowl() {
        return this.cowl_sel;
    }

    public GetCowlEnabled() {
        let lst = [];
        for (let c of this.cowl_list) {
            if (this.GetIsPulsejet()) { //Pulsejets no cowl
                lst.push(c.air && c.rotary && c.liquid); //Only no cowl
            }
            else if (this.NeedCooling()) { //Means liquid
                lst.push(c.liquid);
            }
            else if (this.etype_stats.oiltank) { //Means rotary
                lst.push(c.rotary || c.air);
            }
            else { //Means air cooled
                lst.push(c.air);
            }
        }
        return lst;
    }

    private VerifyCowl(num: number) {
        var can = this.GetCowlEnabled();
        if (can[num])
            this.cowl_sel = num;
        else if (!can[this.cowl_sel])
            this.cowl_sel = 0;
    }

    public SetCowl(num: number) {
        this.VerifyCowl(num);
        this.CalculateStats();
    }

    public GetGeneratorEnabled() {
        return !this.GetIsPulsejet();
    }

    public GetGenerator() {
        return this.is_generator;
    }

    public SetGenerator(use: boolean) {
        if (this.GetGeneratorEnabled()) {
            this.is_generator = use;
        } else {
            this.is_generator = false;
        }
        this.CalculateStats();
    }

    public GetAlternatorEnabled() {
        return !this.GetIsPulsejet() && !this.is_generator;
    }

    public GetAlternator() {
        return this.has_alternator;
    }

    public SetAlternator(use: boolean) {
        if (this.GetAlternatorEnabled()) {
            this.has_alternator = use;
        } else {
            this.has_alternator = false;
        }
        this.CalculateStats();
    }

    public GetRumble() {
        return this.etype_stats.rumble;
    }

    public GetTractor() {
        return {
            has: this.mount_list[this.selected_mount].name == "Tractor"
                || this.mount_list[this.selected_mount].name == "Center-Mounted Tractor",
            spinner: this.GetSpinner()
        };
    }

    public GetPusher() {
        return {
            has: this.mount_list[this.selected_mount].name == "Rear-Mounted Pusher"
                || this.mount_list[this.selected_mount].name == "Center-Mounted Pusher",
            spinner: this.GetSpinner()
        };
    }

    private GetSpinner() {
        if (this.gp_count > 0) {
            if (this.use_ds &&
                (this.mount_list[this.selected_mount].name == "Center-Mounted Tractor"
                    || this.mount_list[this.selected_mount].name == "Center-Mounted Pusher"
                )) { //Uses Extended Driveshafts, can be arty, and rotary engine
                return [true, true];
            }
            else if (!this.etype_stats.oiltank) { //Not rotary, so room for gun but not arty.
                return [true, false];
            }
        }
        //No spinner weapons
        return [false, false];
    }

    public IsElectrics() {
        return this.has_alternator || this.is_generator;
    }

    public GetEngineHeight() {
        if (this.mount_list[this.selected_mount].name == "Pod" || this.etype_stats.pulsejet)
            return 2;
        else if (this.mount_list[this.selected_mount].name == "Nacelle (Offset)")
            return 1;
        else if (this.mount_list[this.selected_mount].name == "Nacelle (Inside)"
            || this.mount_list[this.selected_mount].name == "Channel Tractor")
            return 0;
        return -1;
    }

    public SetCalculateStats(callback: () => void) {
        this.CalculateStats = callback;
    }

    public PartStats(): Stats {
        let stats = new Stats;
        if (this.selected_index > 0)
            stats = stats.Add(this.etype_stats.stats);
        else
            stats = stats.Add(this.etype_stats.stats);

        if (this.etype_stats.oiltank)
            stats.mass += 1;

        if (this.mount_list[this.selected_mount].pp_type == "fuselage")
            stats.latstab -= this.etype_stats.torque;
        else if (this.mount_list[this.selected_mount].pp_type == "wing") {
            if (this.torque_to_struct)
                stats.structure -= this.etype_stats.torque;
            else
                stats.maxstrain -= this.etype_stats.torque;
        }

        //Push-pull
        if (this.use_pp) {
            var pp_type = this.mount_list[this.selected_mount].pp_type;
            stats.power *= 2;
            stats.mass *= 2;
            stats.cooling *= 2;
            stats.fuelconsumption *= 2;
            stats.cost *= 2;
            stats.latstab *= 2;
            stats.structure *= 2;
            stats.maxstrain *= 2;
            stats.power = Math.floor(1.0e-6 + this.pp_list[pp_type].powerfactor * stats.power);
        }

        //Cowls modify engine stats directly, not mounting or upgrade.
        stats = stats.Add(this.cowl_list[this.cowl_sel].stats);
        stats.mass += Math.floor(1.0e-6 + stats.drag * this.cowl_list[this.cowl_sel].mpd);
        stats.drag = Math.floor(1.0e-6 + stats.drag * this.cowl_list[this.cowl_sel].ed);
        if (this.cowl_sel != 0 && this.mount_list[this.selected_mount].reqTail)
            stats.cost += 2;

        // Mounting modifiers (only get applied once, even with push/pull)
        //No Mounting for pulse-jets, just bolted on
        if (!this.etype_stats.pulsejet) {
            stats = stats.Add(this.mount_list[this.selected_mount].stats);
            stats.maxstrain -= Math.floor(1.0e-6 + this.mount_list[this.selected_mount].strainfactor * this.etype_stats.stats.mass);
            stats.drag += Math.floor(1.0e-6 + this.mount_list[this.selected_mount].dragfactor * this.etype_stats.stats.mass);
        }

        //Upgrades
        if (this.use_ds) {
            stats.mass += 1;
        }
        stats.cost += this.gp_count + this.gpr_count;

        if (this.is_generator) {
            stats.charge = Math.floor(1.0e-6 + 2 * stats.power / 10) + 2;
            stats.power = 0;
        } else if (this.has_alternator) {
            stats.charge = Math.floor(1.0e-6 + stats.power / 10) + 1;
            stats.mass += 1;
            stats.cost += 2;
        }


        //Reliability is a part local issue.
        stats.reliability = 0;

        return stats;
    }
}