import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Firebase SDK so the client never touches the network. The spies let
// us assert the exact document shapes / collection paths we write + read.
// `vi.hoisted` so the spies exist before the hoisted `vi.mock` factories run.
const m = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getAuth: vi.fn(() => ({ name: 'auth' })),
  getFirestore: vi.fn(() => ({ name: 'db' })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(async () => {}),
  onAuthStateChanged: vi.fn(
    (_auth: unknown, _cb: (u: unknown) => void) => () => {},
  ),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  setDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn((_ref: unknown, _cb: (s: unknown) => void) => () => {}),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
}))

vi.mock('firebase/app', () => ({ initializeApp: m.initializeApp }))
vi.mock('firebase/auth', () => ({
  getAuth: m.getAuth,
  GoogleAuthProvider: class {},
  signInWithPopup: m.signInWithPopup,
  signOut: m.signOut,
  onAuthStateChanged: m.onAuthStateChanged,
}))
vi.mock('firebase/firestore', () => ({
  getFirestore: m.getFirestore,
  doc: m.doc,
  getDoc: m.getDoc,
  setDoc: m.setDoc,
  collection: m.collection,
  onSnapshot: m.onSnapshot,
  serverTimestamp: m.serverTimestamp,
  deleteField: m.deleteField,
}))

import {
  firebaseUserToGoogleUser,
  signInWithGoogle,
  signOutFirebase,
  subscribeAuth,
  upsertUserProfile,
  saveVotes,
  removeVote,
  clearVotes,
  upsertActivity,
  getMyVotes,
  subscribeGroupVotes,
  subscribeRoster,
  subscribeAppVersion,
  publishAppVersion,
} from './client.ts'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('firebaseUserToGoogleUser', () => {
  it('maps a full Firebase user', () => {
    expect(
      firebaseUserToGoogleUser({
        uid: 'u1',
        displayName: 'Yves Dekerle',
        email: 'yves@example.com',
        photoURL: 'https://pic/1',
      } as never),
    ).toEqual({
      uid: 'u1',
      name: 'Yves Dekerle',
      email: 'yves@example.com',
      picture: 'https://pic/1',
    })
  })

  it('falls back to the email local part when there is no displayName, and omits a missing picture', () => {
    expect(
      firebaseUserToGoogleUser({
        uid: 'u2',
        displayName: null,
        email: 'chloe@example.com',
        photoURL: null,
      } as never),
    ).toEqual({ uid: 'u2', name: 'chloe', email: 'chloe@example.com' })
  })
})

describe('auth', () => {
  it('signInWithGoogle returns the mapped popup user', async () => {
    m.signInWithPopup.mockResolvedValueOnce({
      user: { uid: 'u9', displayName: 'Alex', email: 'a@b.co', photoURL: null },
    })
    expect(await signInWithGoogle()).toEqual({
      uid: 'u9',
      name: 'Alex',
      email: 'a@b.co',
    })
  })

  it('signOutFirebase delegates to signOut', async () => {
    await signOutFirebase()
    expect(m.signOut).toHaveBeenCalledTimes(1)
  })

  it('subscribeAuth maps the user and forwards null on sign-out', () => {
    let emit: (u: unknown) => void = () => {}
    m.onAuthStateChanged.mockImplementationOnce(
      (_auth: unknown, cb: (u: unknown) => void) => {
        emit = cb
        return () => {}
      },
    )
    const cb = vi.fn()
    subscribeAuth(cb)
    emit({ uid: 'u1', displayName: 'Yves', email: 'y@b.co', photoURL: null })
    expect(cb).toHaveBeenLastCalledWith({
      uid: 'u1',
      name: 'Yves',
      email: 'y@b.co',
    })
    emit(null)
    expect(cb).toHaveBeenLastCalledWith(null)
  })
})

describe('firestore writes', () => {
  it('upsertUserProfile writes users/{uid} with merge + version', async () => {
    await upsertUserProfile(
      { uid: 'u1', name: 'Yves', email: 'y@b.co', picture: 'https://p/1' },
      '1.2.3',
    )
    expect(m.doc).toHaveBeenCalledWith(expect.anything(), 'users', 'u1')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'users/u1' },
      expect.objectContaining({
        uid: 'u1',
        name: 'Yves',
        email: 'y@b.co',
        picture: 'https://p/1',
        appVersion: '1.2.3',
        updatedAt: 'SERVER_TS',
      }),
      { merge: true },
    )
  })

  it('saveVotes writes the activities map under votes/{uid} with merge', async () => {
    await saveVotes('u1', 'Yves', {
      a001: { verdict: 'oui' },
      a002: { verdict: 'top', quotaHit: true },
    })
    expect(m.doc).toHaveBeenCalledWith(expect.anything(), 'votes', 'u1')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'votes/u1' },
      {
        uid: 'u1',
        name: 'Yves',
        activities: {
          a001: { verdict: 'oui' },
          a002: { verdict: 'top', quotaHit: true },
        },
        updatedAt: 'SERVER_TS',
      },
      { merge: true },
    )
  })

  it('removeVote deletes a single activity field via setDoc merge (create-safe)', async () => {
    await removeVote('u1', 'a042')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'votes/u1' },
      { activities: { a042: 'DELETE_FIELD' }, updatedAt: 'SERVER_TS' },
      { merge: true },
    )
  })

  it('clearVotes drops the activities map but keeps the doc (merge + deleteField)', async () => {
    await clearVotes('u1')
    expect(m.doc).toHaveBeenCalledWith(expect.anything(), 'votes', 'u1')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'votes/u1' },
      { activities: 'DELETE_FIELD', updatedAt: 'SERVER_TS' },
      { merge: true },
    )
  })

  it('getMyVotes reads votes/{uid} into VoteEntry[]', async () => {
    m.getDoc.mockResolvedValueOnce({
      data: () => ({
        activities: {
          a001: { verdict: 'oui' },
          a002: { verdict: 'top', quotaHit: true },
        },
      }),
    })
    expect(await getMyVotes('u1')).toEqual([
      { id: 'a001', verdict: 'oui' },
      { id: 'a002', verdict: 'top', quotaHit: true },
    ])
  })

  it('getMyVotes returns [] when the doc is missing', async () => {
    m.getDoc.mockResolvedValueOnce({ data: () => undefined })
    expect(await getMyVotes('u1')).toEqual([])
  })

  it('publishAppVersion writes config/app with merge', async () => {
    await publishAppVersion('1.2.3')
    expect(m.doc).toHaveBeenCalledWith(expect.anything(), 'config', 'app')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'config/app' },
      { version: '1.2.3', updatedAt: 'SERVER_TS' },
      { merge: true },
    )
  })

  it('upsertActivity mirrors an activity into activities/{id}', async () => {
    await upsertActivity({
      id: 'a200',
      title: 'X',
      tags: [],
      category: 'c',
      location: 'l',
      transit: 't',
      description: 'd',
      price: 'p',
      rating: 4,
      pepite: false,
      secret: false,
    })
    expect(m.doc).toHaveBeenCalledWith(expect.anything(), 'activities', 'a200')
    expect(m.setDoc).toHaveBeenCalledWith(
      { path: 'activities/a200' },
      expect.objectContaining({ id: 'a200', title: 'X', updatedAt: 'SERVER_TS' }),
      { merge: true },
    )
  })
})

describe('firestore listeners', () => {
  it('subscribeGroupVotes maps every votes doc', () => {
    let emit: (snap: unknown) => void = () => {}
    m.onSnapshot.mockImplementationOnce(
      (_ref: unknown, cb: (s: unknown) => void) => {
        emit = cb
        return () => {}
      },
    )
    const cb = vi.fn()
    subscribeGroupVotes(cb)
    emit({
      docs: [
        {
          id: 'u1',
          data: () => ({
            uid: 'u1',
            name: 'Yves',
            // `bogus` is an unknown verdict written by some other client — it
            // must be dropped on read (rules can't validate the verdict map).
            activities: { a001: { verdict: 'oui' }, a002: { verdict: 'bogus' } },
          }),
        },
        { id: 'u2', data: () => ({ uid: 'u2', name: 'Chloé', activities: {} }) },
      ],
    })
    expect(cb).toHaveBeenCalledWith([
      {
        uid: 'u1',
        name: 'Yves',
        activities: { a001: { verdict: 'oui' } },
        updatedAt: null,
      },
      { uid: 'u2', name: 'Chloé', activities: {}, updatedAt: null },
    ])
  })

  it('subscribeRoster maps every user doc', () => {
    let emit: (snap: unknown) => void = () => {}
    m.onSnapshot.mockImplementationOnce(
      (_ref: unknown, cb: (s: unknown) => void) => {
        emit = cb
        return () => {}
      },
    )
    const cb = vi.fn()
    subscribeRoster(cb)
    emit({ docs: [{ data: () => ({ uid: 'u1', name: 'Yves' }) }] })
    expect(cb).toHaveBeenCalledWith([{ uid: 'u1', name: 'Yves' }])
  })

  it('subscribeAppVersion reports the published config version', () => {
    let emit: (snap: unknown) => void = () => {}
    m.onSnapshot.mockImplementationOnce(
      (_ref: unknown, cb: (s: unknown) => void) => {
        emit = cb
        return () => {}
      },
    )
    const cb = vi.fn()
    subscribeAppVersion(cb)
    emit({ data: () => ({ version: '2.0.0' }) })
    expect(cb).toHaveBeenCalledWith('2.0.0')
    emit({ data: () => undefined })
    expect(cb).toHaveBeenLastCalledWith(null)
  })
})
