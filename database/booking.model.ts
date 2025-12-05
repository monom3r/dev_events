import { Schema, model, models, Document, Model, Types } from 'mongoose';
import { Event, EventDocument } from './event.model';

/**
 * Booking document shape stored in MongoDB.
 */
export interface BookingAttrs {
  eventId: Types.ObjectId;
  email: string;
}

export interface BookingDocument extends BookingAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingModel extends Model<BookingDocument> {}

// Simple email regex for basic validation.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string): boolean => emailRegex.test(value),
        message: 'Email must be a valid email address.',
      },
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    strict: true,
  },
);

// Index on eventId for faster lookups by event.
bookingSchema.index({ eventId: 1 });

/**
 * Pre-save hook to:
 * - Ensure the referenced Event exists.
 * - Validate that the email is well-formed (in addition to schema validation).
 */
bookingSchema.pre('save', async function (next) {
  try {
    const doc = this as BookingDocument;

    // Verify that the referenced event exists.
    const existingEvent: Pick<EventDocument, '_id'> | null = await Event.findById(doc.eventId).select('_id').lean();
    if (!existingEvent) {
      throw new Error('Cannot create booking: referenced event does not exist.');
    }

    // Extra safety: ensure email passes regex check.
    if (!emailRegex.test(doc.email)) {
      throw new Error('Email must be a valid email address.');
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Booking: BookingModel =
  (models.Booking as BookingModel) || model<BookingDocument, BookingModel>('Booking', bookingSchema);
