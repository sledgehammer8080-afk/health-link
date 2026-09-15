import * as db from './db.js'

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function createPatientResource(user) {
  const id = makeId('patient')
  return {
    resourceType: 'Patient',
    id,
    identifier: [
      { use: 'usual', system: 'urn:ietf:rfc:3986', value: user?.email || 'anonymous' },
    ],
    name: user?.name ? [{ text: user.name }] : undefined,
    telecom: user?.email ? [{ system: 'email', value: user.email }] : undefined,
    gender: 'unknown',
    birthDate: undefined,
  }
}

// Map vitals to simple FHIR Observation resources and return a Bundle
export function exportVitalsAsFHIRBundle({ from, to, user } = {}) {
  const vitals = db.getVitals({ from, to }) || []
  const patient = createPatientResource(user)
  const entries = [
    { fullUrl: `urn:uuid:${patient.id}`, resource: patient },
    ...vitals.map((v) => {
      const id = v.id || makeId('obs')
      const obs = {
        resourceType: 'Observation',
        id,
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { text: v.name },
        subject: { reference: `urn:uuid:${patient.id}` },
        effectiveDateTime: v.recorded || v.date || new Date().toISOString(),
        valueQuantity: {
          value: Number(v.value),
          unit: v.unit || '',
          system: v.unit ? 'http://unitsofmeasure.org' : undefined,
        },
      }
      return { fullUrl: `urn:uuid:${id}`, resource: obs }
    }),
  ]

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries,
  }
}

export default { exportVitalsAsFHIRBundle }
