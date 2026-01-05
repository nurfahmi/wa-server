/**
 * Custom MySQL Auth State Handler
 * More reliable alternative to mysql-baileys package
 * Directly manages auth data in MySQL using Sequelize
 * 
 * IMPORTANT: Per Baileys documentation at https://baileys.wiki/docs/socket/connecting
 * - The creds.update event triggers every time creds are updated
 * - saveCreds must save the ACTUAL creds object (passed by reference)
 * - DO NOT use useMultiFileAuthState in production due to IO consumption
 */

import { AuthData } from "../../models/index.js";
import { initAuthCreds, BufferJSON, proto } from "@whiskeysockets/baileys";

/**
 * Custom MySQL auth state implementation
 * @param {string} sessionId - Session identifier
 * @returns {Promise<{state: object, saveCreds: function, removeCreds: function}>}
 */
export async function useCustomMySQLAuthState(sessionId) {
  /**
   * Read auth data from MySQL
   */
  const readData = async (id) => {
    try {
      const data = await AuthData.findOne({
        where: { session: sessionId, id },
        raw: true,
      });
      
      if (!data || !data.value) {
        return null;
      }

      // Parse JSON value
      const parsedValue = typeof data.value === 'string' 
        ? JSON.parse(data.value) 
        : data.value;

      // Handle Buffer data properly
      return JSON.parse(JSON.stringify(parsedValue), BufferJSON.reviver);
    } catch (error) {
      console.error(`Error reading auth data for ${sessionId}:${id}`, error);
      return null;
    }
  };

  /**
   * Write auth data to MySQL
   */
  const writeData = async (id, value) => {
    try {
      const serializedValue = JSON.stringify(value, BufferJSON.replacer);
      
      await AuthData.upsert({
        session: sessionId,
        id,
        value: serializedValue,
      });
    } catch (error) {
      console.error(`Error writing auth data for ${sessionId}:${id}`, error);
      throw error;
    }
  };

  /**
   * Remove specific auth data
   */
  const removeData = async (id) => {
    try {
      await AuthData.destroy({
        where: { session: sessionId, id },
      });
    } catch (error) {
      console.error(`Error removing auth data for ${sessionId}:${id}`, error);
    }
  };

  /**
   * Remove all auth data for session
   */
  const removeAllData = async () => {
    try {
      await AuthData.destroy({
        where: { session: sessionId },
      });
      console.log(`All auth data removed for session ${sessionId}`);
    } catch (error) {
      console.error(`Error removing all auth data for ${sessionId}`, error);
    }
  };

  // Initialize or load credentials from DB
  // IMPORTANT: This object is passed by reference to state.creds
  // When Baileys updates creds internally, it mutates this object directly
  const creds = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,  // This is the same reference that Baileys will mutate
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            let value = await readData(`${type}-${id}`);
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    // IMPORTANT: saveCreds saves the creds object that was passed to state
    // Baileys mutates this object directly, so we just save the current state
    saveCreds: async () => {
      return await writeData("creds", creds);
    },
    removeCreds: removeAllData,
  };
}

export default useCustomMySQLAuthState;

