import { StoreSetting } from "./sitesetting";


 const getStoreSettings = async () => {

  return await StoreSetting.findOne() || await StoreSetting.create({});
};

 const updateStoreSettings = async (data: any) => {
  return await StoreSetting.findOneAndUpdate({}, data, { new: true, upsert: true, runValidators: true });
};

export const siteSettingServices = {
    getStoreSettings,
    updateStoreSettings
}