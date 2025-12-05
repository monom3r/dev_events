import { Schema, model, models, Document, Model } from 'mongoose';

/**
 * Event document shape stored in MongoDB.
 */
export interface EventAttrs {
  title: string;
  slug?: string; // generated from title
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // normalized to ISO string in pre-save hook
  time: string; // normalized to HH:MM (24h) in pre-save hook
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

export interface EventDocument extends EventAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface EventModel extends Model<EventDocument> {}

/**
 * Simple slug generator to create URL-friendly identifiers from titles.
 */
const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric chars
    .replace(/\s+/g, '-') // replace spaces with dashes
    .replace(/-+/g, '-'); // collapse multiple dashes
};

/**
 * Normalize time strings to HH:MM (24-hour) format.
 * Throws if input cannot be parsed into a valid time.
 */
const normalizeTime = (value: string): string => {
  const trimmed = value.trim();
  // Accept formats like HH:MM, H:MM, HHMM, with optional AM/PM.
  const time = new Date(`1970-01-01T${trimmed}`);

  if (Number.isNaN(time.getTime())) {
    throw new Error('Invalid time format for event. Expected a valid time string.');
  }

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
};

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    overview: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      required: true,
      trim: true,
    },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]): boolean =>
          Array.isArray(value) && value.length > 0 && value.every((item) => item.trim().length > 0),
        message: 'Agenda must contain at least one non-empty item.',
      },
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]): boolean =>
          Array.isArray(value) && value.length > 0 && value.every((item) => item.trim().length > 0),
        message: 'Tags must contain at least one non-empty item.',
      },
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    strict: true,
  },
);

// Unique index on slug for fast lookups and enforcing uniqueness at the DB level.
eventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-save hook for:
 * - Validating required string fields are non-empty.
 * - Generating a URL-friendly slug from the title (only when title changes).
 * - Normalizing `date` to ISO format and `time` to HH:MM.
 */
eventSchema.pre('save', function (next) {
  try {
    const doc = this as EventDocument;

    // Ensure required strings are non-empty after trimming.
    const requiredStringFields: (keyof EventAttrs)[] = [
      'title',
      'description',
      'overview',
      'image',
      'venue',
      'location',
      'date',
      'time',
      'mode',
      'audience',
      'organizer',
    ];

    for (const field of requiredStringFields) {
      const value = doc[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Field "${field}" is required and cannot be empty.`);
      }
      // Normalize strings by trimming.
      (doc as unknown as Record<string, unknown>)[field] = value.trim();
    }

    // Only regenerate slug if title has changed or slug is missing.
    if (doc.isModified('title') || !doc.slug) {
      doc.slug = slugify(doc.title);
    }

    // Normalize and validate date as ISO string.
    const parsedDate = new Date(doc.date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format for event. Expected a valid date string.');
    }
    doc.date = parsedDate.toISOString();

    // Normalize time to HH:MM 24-hour format.
    doc.time = normalizeTime(doc.time);

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Event: EventModel = (models.Event as EventModel) || model<EventDocument, EventModel>('Event', eventSchema);
