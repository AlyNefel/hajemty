"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, MessageSquareQuote, Star } from "lucide-react";
import type { CustomerBooking } from "@/lib/customer";
import { cancelMyBookingAction, submitReviewAction } from "@/lib/customer-actions";
import { STATUS_LABEL } from "@/lib/booking/status";
import { fmtDateLong, fmtTime, tunisDateOf } from "@/lib/dashboard/dates";
import { formatTND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { StarInput } from "@/components/ui/star-input";
import { CoverArt } from "@/components/marketplace/CenterCard";
import { StatusPill } from "@/components/dashboard/StatusPill";

export function MyBookings({ upcoming, past }: { upcoming: CustomerBooking[]; past: CustomerBooking[] }) {
  const [reviewing, setReviewing] = useState<CustomerBooking | null>(null);
  return (
    <>
      <section className="mt-10">
        <h2 className="mb-4 font-display text-3xl font-semibold">À venir</h2>
        {upcoming.length ? (
          <ul className="space-y-3">{upcoming.map((b) => <BookingRow key={b.id} b={b} onReview={setReviewing} />)}</ul>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-gold-400/70" />
            <p className="mt-3 text-jasmine-50/70">Aucun rendez-vous prévu.</p>
            <Button asChild className="mt-4"><Link href="/recherche">Trouver un salon</Link></Button>
          </div>
        )}
      </section>
      <section className="mt-12">
        <h2 className="mb-4 font-display text-3xl font-semibold">Historique</h2>
        {past.length ? (
          <ul className="space-y-3">{past.map((b) => <BookingRow key={b.id} b={b} onReview={setReviewing} />)}</ul>
        ) : (
          <p className="text-sm text-jasmine-50/50">Vos visites passées apparaîtront ici.</p>
        )}
      </section>
      <ReviewDialog booking={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function BookingRow({ b, onReview }: { b: CustomerBooking; onReview: (b: CustomerBooking) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const cancel = () => {
    if (!confirm) return setConfirm(true);
    start(async () => {
      const r = await cancelMyBookingAction(b.id);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <li className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
      <Link href={`/center/${b.center.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
        <CoverArt name={b.center.name} palette={b.center.palette} className="size-16 shrink-0 overflow-hidden rounded-2xl [&_span]:text-2xl" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{b.center.name}</p>
          <p className="truncate text-sm text-jasmine-50/60">{b.items.map((i) => i.name).join(", ")}{b.employeeName && ` · avec ${b.employeeName}`}</p>
          <p className="text-sm text-jasmine-50/50 first-letter:uppercase">{fmtDateLong(tunisDateOf(b.start))} · {fmtTime(b.start)} · {formatTND(b.totalMillimes)}</p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <StatusPill status={b.status} label={STATUS_LABEL[b.status]} />
        {b.review && (
          <span className="flex items-center gap-1 rounded-full bg-gold-400/10 px-2.5 py-1 text-xs text-gold-200" title={b.review.comment}>
            <Star className="size-3.5 fill-gold-400 text-gold-400" /> Votre avis : {b.review.rating}/5{b.review.reply && " · le salon a répondu"}
          </span>
        )}
        {b.canReview && <Button size="sm" onClick={() => onReview(b)}><MessageSquareQuote className="size-4" /> Donner mon avis</Button>}
        {b.canCancel && (
          <Button size="sm" variant="outline" disabled={pending} onClick={cancel} className="border-rose-400/40 text-rose-300 hover:border-rose-400 hover:bg-rose-400/10">
            {confirm ? "Confirmer l'annulation" : "Annuler"}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-rose-300 sm:basis-full">{error}</p>}
    </li>
  );
}

function ReviewDialog({ booking, onClose }: { booking: CustomerBooking | null; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const reset = () => { setRating(0); setComment(""); setError(null); setDone(false); onClose(); };

  const submit = () => {
    if (!booking) return;
    if (!rating) return setError("Choisissez une note de 1 à 5 étoiles");
    start(async () => {
      const r = await submitReviewAction({ bookingId: booking.id, rating, comment });
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && reset()}>
      {booking && (
        <DialogContent title={done ? "Merci pour votre avis !" : `Votre avis sur ${booking.center.name}`}
          description={done ? undefined : `${booking.items.map((i) => i.name).join(", ")} · ${fmtDateLong(tunisDateOf(booking.start))}`}>
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-5xl">🎉</p>
              <p className="text-jasmine-50/75">Votre avis est publié et <strong className="text-gold-300">+50 points</strong> ont été ajoutés à votre compte.</p>
              <div className="flex gap-2">
                <Button asChild variant="glass" className="flex-1"><Link href={`/center/${booking.center.slug}#avis`}>Voir l&apos;avis</Link></Button>
                <Button className="flex-1" onClick={reset}>Fermer</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
              <StarInput value={rating} onChange={(v) => { setRating(v); setError(null); }} />
              <Field label="Votre expérience" hint={`${comment.trim().length}/2000 · visible publiquement avec votre prénom`}>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={5}
                  placeholder="Accueil, résultat, ponctualité, ambiance…" />
              </Field>
              <FormError message={error} />
              <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Publication…" : "Publier mon avis"}</Button>
              <p className="text-center text-xs text-jasmine-50/40">Avis vérifié : seuls les clients ayant réalisé la prestation peuvent noter.</p>
            </form>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
