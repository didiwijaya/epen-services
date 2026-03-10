export const kafkaConfig = {
  clientId: 'master-data-service',
  brokers: [(process.env.KAFKA_BROKERS || 'localhost:9094')],
  groupId: 'master-data-service-group',
};
