// Package subscription calcula el estado de la suscripción mensual de un cliente.
package subscription

import "time"

type Status string

const (
	Active    Status = "active"
	Suspended Status = "suspended" // suspendido a mano desde el panel
	Expired   Status = "expired"   // venció y pasaron los días de gracia
)

const dateLayout = "2006-01-02"

// Date devuelve la fecha (sin hora) de t en la zona dada, como "AAAA-MM-DD".
func Date(t time.Time, loc *time.Location) string { return t.In(loc).Format(dateLayout) }

// Compute decide si el cliente puede usar la app. Los administradores nunca vencen.
func Compute(isAdmin, suspended bool, paidUntil string, today string, graceDays int) Status {
	switch {
	case isAdmin:
		return Active
	case suspended:
		return Suspended
	}
	until, err := time.Parse(dateLayout, paidUntil)
	if err != nil {
		return Expired
	}
	now, err := time.Parse(dateLayout, today)
	if err != nil {
		return Expired
	}
	if now.After(until.AddDate(0, 0, graceDays)) {
		return Expired
	}
	return Active
}

// Extend suma meses al vencimiento. Si ya venció, cuenta desde hoy para no cobrar días sin servicio.
func Extend(paidUntil, today string, months int) string {
	base, err := time.Parse(dateLayout, paidUntil)
	now, _ := time.Parse(dateLayout, today)
	if err != nil || base.Before(now) {
		base = now
	}
	return base.AddDate(0, months, 0).Format(dateLayout)
}

// AddDays suma días a una fecha "AAAA-MM-DD".
func AddDays(date string, days int) string {
	d, _ := time.Parse(dateLayout, date)
	return d.AddDate(0, 0, days).Format(dateLayout)
}
