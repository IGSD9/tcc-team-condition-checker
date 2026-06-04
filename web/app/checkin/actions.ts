"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseOtherNoteFromForm } from "@/lib/other-note";
import { CheckinPayloadSchema } from "@/lib/checkin-codes";
import { getAccessTokenFromRequest, getAppUserFromAccessToken } from "@/lib/auth";

const toNumberOrNull = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseReportDate = (value: FormDataEntryValue | null): Date => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("reportDate is required.");
  }
  // Keep a local-day semantic (YYYY-MM-DD) and persist as date-only value.
  return new Date(`${value}T00:00:00`);
};

export async function submitCheckinAction(formData: FormData) {
  const accessToken = await getAccessTokenFromRequest();
  const appUser = await getAppUserFromAccessToken(accessToken);

  if (!appUser) {
    redirect("/login");
  }

  const payload = {
    sleep: toNumberOrNull(formData.get("sleep")),
    body: toNumberOrNull(formData.get("body")),
    mood: toNumberOrNull(formData.get("mood")),
    fog: toNumberOrNull(formData.get("fog")),
    energy: toNumberOrNull(formData.get("energy")),
    connection: toNumberOrNull(formData.get("connection")),
    wednesdayExtra: toNumberOrNull(formData.get("wednesdayExtra")),
  };

  const parsed = CheckinPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    redirect("/checkin?error=invalid_payload");
  }

  const reportDate = parseReportDate(formData.get("reportDate"));
  const otherNote = parseOtherNoteFromForm(formData.get("otherNote"));
  const data = parsed.data;

  await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: appUser.id,
        reportDate,
      },
    },
    create: {
      userId: appUser.id,
      reportDate,
      sleep: data.sleep,
      body: data.body,
      mood: data.mood,
      fog: data.fog,
      energy: data.energy,
      connection: data.connection,
      wednesdayExtra: data.wednesdayExtra ?? null,
      otherNote,
    },
    update: {
      sleep: data.sleep,
      body: data.body,
      mood: data.mood,
      fog: data.fog,
      energy: data.energy,
      connection: data.connection,
      wednesdayExtra: data.wednesdayExtra ?? null,
      otherNote,
    },
  });

  redirect("/checkin/completed");
}

