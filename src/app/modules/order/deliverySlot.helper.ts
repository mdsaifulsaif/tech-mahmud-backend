export interface IDeliverySlotOption {
  id: string;          // unique identifier — frontend select করবে এটা দিয়ে
  date: Date;
  label: string;
  startTime: string;
  endTime: string;
}

// ✅ Cutoff time অনুযায়ী আজকের slot এখনো available কিনা চেক করে
// এবং পরবর্তী কয়েকদিনের slot generate করে
export const generateAvailableDeliverySlots = (): IDeliverySlotOption[] => {
  const slots: IDeliverySlotOption[] = [];
  const now = new Date();

  // ✅ Fixed slot definitions — প্রতিদিনের জন্য
  const dailySlotTemplates = [
    { startHour: 10, endHour: 12, label: "10 AM - 12 PM" },
    { startHour: 16, endHour: 18, label: "4 PM - 6 PM" },
  ];

  // ✅ আজ + আগামী ২ দিন (total 3 দিন) এর slot বানাবো
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const slotDate = new Date(now);
    slotDate.setDate(now.getDate() + dayOffset);
    slotDate.setHours(0, 0, 0, 0);

    const dayLabel =
      dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : slotDate.toDateString();

    for (const template of dailySlotTemplates) {
      const slotStart = new Date(slotDate);
      slotStart.setHours(template.startHour, 0, 0, 0);

      // ✅ আজকের slot হলে — cutoff চেক করো (slot start এর ১ ঘণ্টা আগে অর্ডার বন্ধ)
      if (dayOffset === 0) {
        const cutoffTime = new Date(slotStart);
        cutoffTime.setHours(cutoffTime.getHours() - 1);
        if (now > cutoffTime) {
          continue; // এই slot এখন আর available না
        }
      }

      slots.push({
        id: `${slotDate.toISOString().split("T")[0]}_${template.startHour}-${template.endHour}`,
        date: slotDate,
        label: `${dayLabel} (${template.label})`,
        startTime: `${String(template.startHour).padStart(2, "0")}:00`,
        endTime: `${String(template.endHour).padStart(2, "0")}:00`,
      });
    }
  }

  return slots;
};

// ✅ frontend থেকে আসা slot id validate করে actual slot object রিটার্ন করে
export const validateAndGetDeliverySlot = (slotId: string): IDeliverySlotOption | null => {
  const availableSlots = generateAvailableDeliverySlots();
  return availableSlots.find((s) => s.id === slotId) || null;
};