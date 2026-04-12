/**
 * Shared Kafka utilities entry point
 * Provides convenient access to all shared Kafka resources
 */

const TOPICS = require('./kafka/topics');
const EVENTS = require('./kafka/events');
const { createEvent } = require('./kafka/eventFactory');

module.exports = {
  TOPICS,
  EVENTS,
  createEvent,
};
