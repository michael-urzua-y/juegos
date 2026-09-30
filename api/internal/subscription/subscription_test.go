package subscription

import "testing"

func TestCompute(t *testing.T) {
	cases := []struct {
		name      string
		admin     bool
		suspended bool
		paidUntil string
		today     string
		want      Status
	}{
		{"al día", false, false, "2026-10-10", "2026-09-30", Active},
		{"vence hoy", false, false, "2026-09-30", "2026-09-30", Active},
		{"dentro de la gracia", false, false, "2026-09-28", "2026-10-01", Active},
		{"pasada la gracia", false, false, "2026-09-27", "2026-10-01", Expired},
		{"suspendido aunque esté al día", false, true, "2027-01-01", "2026-09-30", Suspended},
		{"sin fecha", false, false, "", "2026-09-30", Expired},
		{"administrador nunca vence", true, true, "", "2026-09-30", Active},
	}
	for _, c := range cases {
		if got := Compute(c.admin, c.suspended, c.paidUntil, c.today, 3); got != c.want {
			t.Errorf("%s: got %s, want %s", c.name, got, c.want)
		}
	}
}

func TestExtend(t *testing.T) {
	if got := Extend("2026-10-15", "2026-09-30", 1); got != "2026-11-15" {
		t.Errorf("al día: got %s", got)
	}
	if got := Extend("2026-08-01", "2026-09-30", 1); got != "2026-10-30" {
		t.Errorf("vencido cuenta desde hoy: got %s", got)
	}
	if got := Extend("", "2026-09-30", 2); got != "2026-11-30" {
		t.Errorf("sin fecha: got %s", got)
	}
}
