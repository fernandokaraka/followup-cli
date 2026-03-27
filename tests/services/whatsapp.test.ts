import { describe, it, expect } from "vitest";
import { formatWhatsappLink } from "../../src/services/whatsapp.js";

describe("whatsapp service", () => {
  it("returns null for empty string", () => {
    expect(formatWhatsappLink("")).toBeNull();
  });

  it("formats plain number with country code", () => {
    expect(formatWhatsappLink("5511999999999")).toBe("https://wa.me/5511999999999");
  });

  it("strips spaces, parens, hyphens", () => {
    expect(formatWhatsappLink("(11) 99999-9999")).toBe("https://wa.me/5511999999999");
  });

  it("strips plus sign", () => {
    expect(formatWhatsappLink("+5511999999999")).toBe("https://wa.me/5511999999999");
  });

  it("adds 55 prefix for local numbers (11 digits)", () => {
    expect(formatWhatsappLink("11999999999")).toBe("https://wa.me/5511999999999");
  });

  it("does not add 55 for international numbers", () => {
    expect(formatWhatsappLink("14155551234")).toBe("https://wa.me/5514155551234");
  });

  it("handles number with 13 digits (already has country code)", () => {
    expect(formatWhatsappLink("5521988887777")).toBe("https://wa.me/5521988887777");
  });
});
