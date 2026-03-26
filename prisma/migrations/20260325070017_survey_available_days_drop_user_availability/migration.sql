/*
  Warnings:

  - You are about to drop the `user_availabilities` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "user_availabilities" DROP CONSTRAINT "user_availabilities_user_id_fkey";

-- AlterTable
ALTER TABLE "onboarding_surveys" ADD COLUMN     "available_days" "day_of_week"[];

-- DropTable
DROP TABLE "user_availabilities";
