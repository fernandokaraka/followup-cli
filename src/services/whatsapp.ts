import { type BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { clientes } from "../db/schema.js";
import { eq } from "drizzle-orm";

export function formatWhatsappLink(whatsapp: string): string | null {
  const cleaned = whatsapp.replace(/[\s()\-+]/g, "");
  if (!cleaned) return null;

  // Add Brazil country code if not present (number starts with local area code)
  const withCountry = cleaned.length <= 11 ? `55${cleaned}` : cleaned;
  return `https://wa.me/${withCountry}`;
}

export function getClienteWhatsappLink(
  db: BaseSQLiteDatabase<"sync", void>,
  clienteId: number
): string | null {
  const cliente = db.select().from(clientes).where(eq(clientes.id, clienteId)).get();
  if (!cliente || !cliente.whatsapp) return null;
  return formatWhatsappLink(cliente.whatsapp);
}
